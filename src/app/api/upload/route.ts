import { NextResponse } from 'next/server'
import { initializeApp } from 'firebase/app'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp,
} from 'firebase/firestore'
// import { getAnalytics } from 'firebase/analytics'
import OpenAI from 'openai'
import { firebaseConfig } from '@/lib/firebase'

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
// Initialize Firebase
const app = initializeApp(firebaseConfig)
// const analytics = getAnalytics(app)
const storage = getStorage(app)
const db = getFirestore(app)

// File size limit (25MB - Whisper's limit)
const MAX_FILE_SIZE = 25 * 1024 * 1024

// Chunk size: 24MB to stay safely under Whisper's 25MB limit
const CHUNK_SIZE = 24 * 1024 * 1024

interface Summary {
  key_points: string[];
  action_items: string[];
  main_topics: string[];
}

interface MeetingSummary {
  userId: string;
  audioUrl: string;
  transcription: string;
  summary: Summary;
  createdAt: any; // FirebaseTimestamp
  title?: string;
}

async function generateSummary(transcription: string): Promise<Summary> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Summarize meetings concisely. Output JSON with:
            key_points: 3 main discussion points
            action_items: 2-3 specific tasks or decisions
            main_topics: 2 primary themes
            Keep points brief and clear. JSON format only.`
        },
        {
          role: "user",
          content: `Summarize meeting: ${transcription}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 500,
    })

    const summary = JSON.parse(completion.choices[0].message.content || '{"key_points":[], "action_items":[], "main_topics":[]}') as Summary
    // Ensure minimum items in each array
    if (!summary.key_points?.length) summary.key_points = ["No key points identified"]
    if (!summary.action_items?.length) summary.action_items = ["No action items identified"]
    if (!summary.main_topics?.length) summary.main_topics = ["No main topics identified"]
    return summary
  } catch (error: any) {
    console.error('Summary generation error:', error)
    throw new Error('Failed to generate summary: ' + error.message)
  }
}

async function transcribeAudioChunk(chunk: Blob, index: number): Promise<string> {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: new File([chunk], `chunk-${index}.mp3`, {
        type: 'audio/mpeg',
        lastModified: Date.now()
      }),
      model: 'whisper-1',
      language: 'en',
      response_format: 'text',
    })
    return transcription
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.')
    }
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    throw new Error(`Failed to transcribe chunk ${index}: ${message}`)
  }
}

async function transcribeAudio(audioFile: File): Promise<string> {
  try {
    const buffer = await audioFile.arrayBuffer()
    
    // If file is under chunk size, process normally
    if (buffer.byteLength <= CHUNK_SIZE) {
      const transcription = await openai.audio.transcriptions.create({
        file: new File([buffer], 'audio.mp3', {
          type: audioFile.type,
          lastModified: Date.now()
        }),
        model: 'whisper-1',
        language: 'en',
        response_format: 'text',
      })
      return transcription
    }

    // For larger files, split into chunks
    const chunks: Blob[] = []
    let offset = 0
    
    while (offset < buffer.byteLength) {
      const chunk = buffer.slice(offset, offset + CHUNK_SIZE)
      chunks.push(new Blob([chunk], { type: audioFile.type }))
      offset += CHUNK_SIZE
    }

    console.log(`Processing ${chunks.length} chunks...`)

    // Process chunks with a small delay between each to avoid rate limits
    const transcriptions: string[] = []
    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      console.log(`Transcribing chunk ${i + 1}/${chunks.length}`)
      const chunkTranscription = await transcribeAudioChunk(chunks[i], i)
      transcriptions.push(chunkTranscription)
    }

    // Combine all transcriptions
    return transcriptions.join(' ')

  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.')
    }
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    throw new Error('Failed to transcribe audio: ' + message)
  }
}

async function storeSummary(data: MeetingSummary) {
  try {
    const summaryRef = await addDoc(collection(db, 'summaries'), {
      ...data,
      createdAt: serverTimestamp(),
    })
    return summaryRef.id
  } catch (error) {
    console.error('Firestore storage error:', error)
    throw new Error('Failed to store summary')
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('audio') as File
    // Get user ID from session/auth (implement your auth logic)
    const userId = 'test-user' // Temporary! Replace with actual auth

    // Validate file existence
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file size
    // if (file.size > MAX_FILE_SIZE) {
    //   return NextResponse.json({ error: 'File size exceeds 25MB limit' }, { status: 400 })
    // }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/mp4']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only MP3, WAV, and M4A files are allowed' },
        { status: 400 }
      )
    }

    // Create a unique filename
    const timestamp = Date.now()
    const fileName = `audio/${userId}/${timestamp}-${file.name}`
    
    // Create a reference to the file location in Firebase Storage
    const storageRef = ref(storage, fileName)

    // Convert File to ArrayBuffer for upload
    const buffer = await file.arrayBuffer()

    // Upload the file to Firebase Storage
    await uploadBytes(storageRef, buffer, {
      contentType: file.type,
    })

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef)

    // Transcribe the audio
    const transcription = await transcribeAudio(file)

    // Generate summary
    const summary = await generateSummary(transcription)

    // Store in Firestore
    const summaryId = await storeSummary({
      userId,
      audioUrl: downloadURL,
      transcription,
      summary,
      createdAt: null, // Will be set by serverTimestamp()
      title: file.name.replace(/\.[^/.]+$/, '') // Remove extension
    })

    return NextResponse.json({
      success: true,
      url: downloadURL,
      transcription,
      summary,
      summaryId
    })
  } catch (error: any) {
    console.error('Processing error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to process file',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: error.status || 500 }
    )
  }
}

// Update the file size limit in the config
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb', // Increased to handle larger files
    },
  },
}
