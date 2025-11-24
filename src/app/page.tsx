import { redirect } from 'next/navigation';

// Server-side redirect to home page - ensures users always land on home first
export default function RootPage() {
  redirect('/home');
}
