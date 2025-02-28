import AudioUploader from '@/components/AudioUploader'

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold text-center mb-8">
        Meeting Notes Summarizer
      </h1>
      <AudioUploader />
    </main>
  );
}
