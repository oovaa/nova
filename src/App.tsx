import { useState } from 'react'
import { Toaster } from './components/ui/toaster'
import { Toaster as Sonner } from './components/ui/sonner'
import { TooltipProvider } from './components/ui/tooltip'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import Index from './pages/Index'
import NotFound from './pages/NotFound'
import { Analytics } from '@vercel/analytics/react'
import { MarkdownRenderer } from './components/ui/markdown-renderer'

const queryClient = new QueryClient()

const App = () => {
  const [markdownContent, setMarkdownContent] = useState('')

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path='/' element={<Index />} />
              <Route
                path='/markdown'
                element={
                  <MarkdownRenderer
                    content={markdownContent}
                    onContentChange={setMarkdownContent}
                  />
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path='*' element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
      <Analytics />
    </QueryClientProvider>
  )
}

export default App
