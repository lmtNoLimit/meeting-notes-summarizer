import { NextResponse } from 'next/server'
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs 
} from 'firebase/firestore'
import { initializeApp } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase'

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export async function GET(request: Request) {
  try {
    // Get user ID from session/auth (implement your auth logic)
    const userId = 'test-user' // Temporary! Replace with actual auth
    
    const { searchParams } = new URL(request.url)
    const lastId = searchParams.get('lastId')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    let summariesQuery = query(
      collection(db, 'summaries'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    )

    if (lastId) {
      const lastDoc = await getDocs(
        query(collection(db, 'summaries'), where('id', '==', lastId))
      )
      summariesQuery = query(
        summariesQuery,
        startAfter(lastDoc.docs[0])
      )
    }

    const snapshot = await getDocs(summariesQuery)
    const summaries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate().toISOString()
    }))

    return NextResponse.json({
      summaries,
      hasMore: summaries.length === pageSize
    })
  } catch (error: any) {
    console.error('Error fetching summaries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch summaries' },
      { status: 500 }
    )
  }
} 