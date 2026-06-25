# College Event Management System

A comprehensive web application for managing college events, clubs, placements, and announcements with separate portals for students and administrators.

<<<<<<< HEAD
=======
## 🚀 Live Demo

**URL**:[ https://iist-connect-mmbb.vercel.app/](https://iist-connect.vercel.app/)

>>>>>>> 7ea45bf6b2ae1422b389f65de2e6b949931463ff
## 📋 Project Overview

This full-stack web application streamlines college event management by providing dedicated dashboards for students and administrators. Students can browse and join events, explore clubs, view placement opportunities, and stay updated with announcements. Administrators have complete control over managing events, clubs, placements, student records, and announcements.

## ✨ Features

### Student Portal
- **Authentication**: Secure login/signup with email verification
- **Event Management**: 
  - Browse upcoming events with detailed information
  - Join events with one-click registration
  - View event location, date, time, and Google Form links
- **Clubs Directory**: Explore all college clubs with descriptions
- **Placement Opportunities**: 
  - View placement drives (available for 7th & 8th semester students)
  - Access company details and application forms
- **Announcements**: Stay updated with college-wide and role-specific announcements
- **Profile Management**: View and manage personal profile information
- **Responsive Design**: Mobile-friendly interface with hamburger menu

### Admin Portal
- **Dashboard Overview**: Comprehensive view of all system data
- **Event Management**:
  - Create, update, and delete events
  - Track student attendance for each event
  - Set event status (active/inactive)
  - Add Google Form URLs for registrations
- **Club Management**: Full CRUD operations for clubs
- **Placement Management**: 
  - Post placement opportunities
  - Set eligibility criteria (semester-based)
  - Track active/inactive placements
- **Student Management**:
  - View all student records
  - Advanced filtering by year, semester, branch, and section
  - Search functionality for quick lookups
- **Announcement System**: Create targeted announcements for specific roles
- **Analytics**: View student participation metrics for events

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18.3.1
- **Build Tool**: Vite
- **Language**: TypeScript
- **Routing**: React Router DOM 6.30.1
- **State Management**: TanStack Query (React Query) 5.83.0
- **Styling**: 
  - Tailwind CSS
  - shadcn/ui components
  - CSS custom properties for theming
- **UI Components**: 
  - Radix UI primitives
  - Lucide React icons
  - Sonner for toast notifications

### Backend (Supabase)
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime (for live updates)
- **API**: Supabase JavaScript Client

### Form Handling & Validation
- **React Hook Form** 7.61.1
- **Zod** 3.25.76 for schema validation
- **@hookform/resolvers** 3.10.0

### Additional Libraries
- **date-fns** 3.6.0 - Date formatting and manipulation
- **clsx** & **tailwind-merge** - Conditional styling
- **class-variance-authority** - Component variants
- **embla-carousel-react** - Carousel functionality

## 📊 Database Schema

### Tables

#### `profiles`
- User profile information
- Fields: id, name, email, role, college_id, semester, branch, section, avatar_url
- Links to Supabase Auth users

#### `events`
- Event information
- Fields: id, title, description, date_time, location, status, google_form_url, club_id
- RLS policies for admin management and public viewing

#### `event_attendance`
- Tracks student event registrations
- Fields: id, event_id, user_id, joined_at, left_at
- Enables attendance tracking and analytics

#### `clubs`
- College clubs and organizations
- Fields: id, name, description, created_by
- Viewable by all, manageable by admins

#### `placements`
- Placement opportunities
- Fields: id, title, description, company_name, google_form_url, eligibility_semesters, status
- Filtered by student semester (7th/8th only)

#### `announcements`
- System-wide notifications
- Fields: id, title, content, target_role, created_by
- Role-based visibility (all, students, admins)

#### `students`
- Detailed student records
- Fields: id, full_name, email, phone_number, date_of_birth, year, semester, branch, section
- Admin-only access with student self-view

### Row Level Security (RLS)
- **Students**: Can view their own data and public information
- **Admins**: Full CRUD access to all management tables
- **Events**: Public viewing, admin management
- **Announcements**: Role-based filtering

## 🔐 Authentication Flow

1. **Registration**: Users sign up with email, name, role (student/admin), and additional details
2. **Auto-confirmation**: Email verification is auto-confirmed for development
3. **Profile Creation**: Automatic profile creation via database trigger (`handle_new_user()`)
4. **Session Management**: Persistent sessions with auto-refresh tokens
5. **Role-based Access**: Separate dashboards for students and admins

## 🎨 Design System

### Color Scheme
- **Primary**: HSL-based color system with light/dark mode support
- **Semantic Tokens**: Background, foreground, muted, accent, destructive
- **Gradients**: Custom gradient definitions for modern UI
- **Shadows**: Elevation system for depth

### Components
- **Fully Accessible**: Built on Radix UI primitives
- **Customizable**: Variants for different states and styles
- **Responsive**: Mobile-first design approach
- **Theme-aware**: Automatic dark/light mode support

## 📁 Project Structure

```
├── src/
│   ├── components/
│   │   └── ui/              # shadcn/ui components
│   ├── hooks/               # Custom React hooks
│   ├── integrations/
│   │   └── supabase/        # Supabase client & types
│   ├── lib/                 # Utility functions
│   ├── pages/
│   │   ├── Index.tsx        # Landing page
│   │   ├── StudentAuth.tsx  # Student login/signup
│   │   ├── AdminAuth.tsx    # Admin login/signup
│   │   ├── StudentDashboard.tsx
│   │   ├── AdminDashboard.tsx
│   │   └── NotFound.tsx
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles & design tokens
├── supabase/
│   ├── config.toml          # Supabase configuration
│   └── migrations/          # Database migrations
├── public/                  # Static assets
└── package.json            # Dependencies
```

## 🚀 Getting Started

### Prerequisites
- Node.js & npm
- Git

### Installation

1. **Clone the repository**
```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env` file with Supabase credentials:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

4. **Start the development server**
```bash
npm run dev
```

The app will be available at `http://localhost:8080`

### Build for Production

```bash
npm run build
```

## 🌐 Deployment

For detailed deployment instructions, please refer to [DEPLOYMENT.md](DEPLOYMENT.md).

### Quick Hosting Options
- **Netlify**: Drag and drop the `dist` folder.
- **Vercel**: Connect your Git repository.

## 📱 Routes

- `/` - Landing page
- `/student/auth` - Student authentication
- `/admin/auth` - Admin authentication
- `/student/dashboard` - Student dashboard
- `/admin/dashboard` - Admin dashboard
- `/*` - 404 Not Found page

## 🔧 Development Tools

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Quality
- **TypeScript**: Full type safety
- **ESLint**: Code linting
- **Prettier**: Code formatting

## 🎯 Key Functionalities Implemented

### Phase 1: Authentication & Authorization
- ✅ Dual authentication portals (Student & Admin)
- ✅ Role-based access control
- ✅ Automatic profile creation
- ✅ Session persistence

### Phase 2: Student Features
- ✅ Event browsing and registration
- ✅ Club directory
- ✅ Placement opportunities (semester-filtered)
- ✅ Announcement feed
- ✅ Responsive navigation

### Phase 3: Admin Features
- ✅ Event management (CRUD)
- ✅ Club management (CRUD)
- ✅ Placement management (CRUD)
- ✅ Student database with filtering
- ✅ Announcement system
- ✅ Event attendance tracking

### Phase 4: Database & Security
- ✅ Comprehensive database schema
- ✅ Row Level Security policies
- ✅ Data validation and constraints
- ✅ Relational data integrity

### Phase 5: UI/UX Polish
- ✅ Modern, responsive design
- ✅ Dark/light mode support
- ✅ Toast notifications
- ✅ Loading states
- ✅ Error handling

## 🔒 Security Features

- **Row Level Security (RLS)**: Database-level access control
- **Authentication**: Secure email-based authentication
- **Session Management**: Auto-refresh tokens
- **Input Validation**: Zod schema validation
- **SQL Injection Protection**: Parameterized queries via Supabase
- **XSS Protection**: React's built-in escaping

## 🔮 Future Enhancements

- Event calendar view
- Real-time notifications
- QR code-based attendance
- Analytics dashboard with charts
- Email notification system
- Chat/discussion forums
- Certificate generation
- Bulk student import (CSV)
- Event feedback and ratings

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

## 📄 License

This project is part of a learning initiative. Feel free to use it as a reference for your own projects.
#   I I S T - c o n n e c t  
 #   I I S T - c o n n e c t  
 