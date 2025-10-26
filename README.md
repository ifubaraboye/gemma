
# Gemma

An elegant, full-stack AI chat application built with **Next.js**, **Tailwind CSS**, **shadcn/ui**, **Supabase**, **OpenRouter API**, and **Clerk** authentication.

**Live Demo:** [https://gemma-chat.vercel.app/](https://gemma-chat.vercel.app/)

---

##  Overview

**Gemma** is a modern AI-powered chat experience that lets users interact with advanced language models through a sleek and responsive interface.  
It’s built for scalability, security, and seamless real-time interaction.

---

## Features

- **Fast and dynamic UI** using Next.js and shadcn/ui  
- **Beautiful styling** with Tailwind CSS  
- **Secure authentication** and user management with Clerk  
- **Persistent chat history** stored in Supabase  
- **AI conversations** powered by OpenRouter API  
- **Fully responsive design** for desktop and mobile  
- **Instant routing and caching** for smooth chat experiences  

---

## Tech Stack

| Layer | Technology |
|-------|-------------|
| Frontend | [Next.js](https://nextjs.org/) + [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| Backend | [Supabase](https://supabase.com/) |
| Auth | [Clerk](https://clerk.com/) |
| AI API | [OpenRouter API](https://openrouter.ai/) |
| Hosting | [Vercel](https://vercel.com/) |

---

## Setup & Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/gemma-chat.git
   cd gemma-chat
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**

   Create a `.env.local` file and add the following:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

   The app will be live at [http://localhost:3000](http://localhost:3000)

---

## How It Works

1. **User signs in** via Clerk authentication  
2. **New chats** are created and stored in Supabase with unique IDs  
3. **Messages** are processed through the OpenRouter API  
4. **Responses** are cached and displayed in real time  
5. **UI updates instantly** using client-side routing and state management  

---

## Development Notes

- Uses **App Router** and **Server Actions** in Next.js  
- Implements **UUID-based chat IDs** for data privacy  
- Sidebar updates dynamically as chats are created  
- Supports **loading indicators** and chat caching for a smoother UX  

---

## Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to open a PR or issue.

---

## License

This project is licensed under the **MIT License**.

---
