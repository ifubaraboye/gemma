import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Layout from './Layout.tsx' // Import the new Layout
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
// import { SidebarTrigger } from './components/ui/sidebar.tsx'
import Chat from "./pages/chat/chat.tsx"

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

const router = createBrowserRouter([
  {
    element: <Layout />, // Wrap routes in the Layout
    children: [
      {
        path: "/",
        element: <App />,
      },
      {
        path: 'chat/:chatId',
        element: <Chat />
      }
    ]
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <RouterProvider router={router} />
    </ConvexProvider>
  </StrictMode>,
)