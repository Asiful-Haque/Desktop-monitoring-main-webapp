import TaskScreenshots from "@/components/TakeScreenshots";


export default async function Page({ params }) {
  const { idOfTask } = await params;

  // Fetch screenshot data from your API
  const res = await fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/screenshot-data/${idOfTask}`, {
    cache: "no-store", 
  });

  if (!res.ok) {
    return <div className="p-6">Failed to load screenshot data.</div>;
  }

  const data = await res.json();

  return <TaskScreenshots screenshots={data} />;
}
