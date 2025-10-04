import { useState } from 'react'
import MainLayout from './components/layout/MainLayout'
import './App.css'

function App() {
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null)

  return (
    <div className="App">
      <MainLayout 
        currentDocumentId={currentDocumentId}
        onDocumentSelect={setCurrentDocumentId}
      />
    </div>
  )
}

export default App
