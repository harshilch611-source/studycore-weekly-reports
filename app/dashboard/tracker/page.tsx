import { fetchTrackerData } from '@/lib/tracker';
import TrackerClient from './TrackerClient';

export const revalidate = 0;

export default async function TrackerPage() {
  const students = await fetchTrackerData();
  return <TrackerClient students={students} />;
}
