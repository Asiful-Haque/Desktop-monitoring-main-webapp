// app/manual-time/page.js
import ManualTimeForm from '@/components/ManualTimeForm/ManualTimeForm';
import { cookies } from 'next/headers';
import jwt from "jsonwebtoken";

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const currentUser = token ? jwt.decode(token) : null;
  const userIdCookie = currentUser ? currentUser.id : null;
  const cookieHeader = `token=${token}`;

  console.log("User ID from cookie:", userIdCookie);

  if (!userIdCookie) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-2">Manual Time Entry</h1>
        <p className="text-sm text-muted-foreground">
          Missing <code>user_id</code> cookie. Please sign in or set the cookie to continue.
        </p>
      </div>
    );
  }

  const developerId = Number(userIdCookie);

  let tasks = [];
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/tasks/${developerId}`, {
      cache: 'no-store',
    headers: {
        Cookie: cookieHeader, 
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status} ${res.statusText}`);
    const data = await res.json();
    tasks = data?.tasks ?? [];
    console.log("Tasks fetched:", tasks);
  } catch (e) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-2">Manual Time Entry</h1>
        <p className="text-sm text-red-600">
          Couldn’t load tasks for user <strong>{developerId}</strong>. {String(e)}
        </p>
      </div>
    );
  }

  return (
  <div className='p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen'>
  <ManualTimeForm tasks={tasks} developerId={developerId} />
  </div>
  );

}
