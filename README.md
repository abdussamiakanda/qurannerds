# QuranNerds

A Medium-inspired platform for sharing Quran study posts, reflections, and insights. Built with React.js, CSS, and Supabase.

## Features

- 📖 Beautiful, Medium-like interface for reading posts
- ✍️ Create and edit your own Quran study posts
- 🔐 User authentication (sign up, sign in, sign out)
- 📱 Responsive design that works on all devices
- 🎨 Clean, modern UI with elegant typography

## Tech Stack

- **React.js** - Frontend framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Supabase** - Backend (database & authentication)
- **CSS** - Styling (no frameworks, pure CSS)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to your project's SQL Editor
3. Run the SQL script from `supabase-schema.sql` to create the `posts` and `profiles` tables
4. **Set up Storage Bucket:**
   - Go to Storage in your Supabase dashboard
   - Click "Create Bucket"
   - Name: `images`
   - Make it **Public** (check the public checkbox)
   - Click "Create bucket"
   - Go to Storage > Policies
   - Click "New Policy" and create policies for the `images` bucket (see storage policies in `supabase-schema.sql` comments)
5. Go to Settings > API to get your project URL and anon key

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 5. Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Supabase Database Schema

The app requires a `posts` table with the following structure:

- `id` (uuid, primary key)
- `title` (text)
- `content` (text)
- `author_id` (uuid, references auth.users)
- `author_email` (text)
- `author_name` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

See `supabase-schema.sql` for the complete SQL schema.

## Project Structure

```
qurannerds/
├── src/
│   ├── components/       # Reusable components
│   │   ├── Navbar.jsx
│   │   └── Navbar.css
│   ├── pages/            # Page components
│   │   ├── Home.jsx
│   │   ├── Post.jsx
│   │   ├── CreatePost.jsx
│   │   ├── EditPost.jsx
│   │   └── Auth.jsx
│   ├── lib/              # Utilities
│   │   └── supabase.js
│   ├── App.jsx           # Main app component
│   ├── App.css
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Features in Detail

### Home Page
- Displays all posts in a beautiful grid layout
- Shows author information and post dates
- Responsive design for mobile and desktop

### Post Creation
- Rich text editor for writing posts
- Clean, distraction-free writing interface
- Automatic saving and publishing

### Post Viewing
- Full post display with elegant typography
- Author information and metadata
- Edit/delete options for post authors

### Authentication
- Email/password authentication
- User registration and login
- Secure session management

## License

MIT

