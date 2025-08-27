import { getAllMedleys } from "@/lib/api/medleys";
import HomePageClient from "@/components/pages/HomePageClient";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function Home() {
    try {
        console.log('🏠 Homepage: Starting to fetch medleys...');
        // SSR: Fetch medleys data at build/request time
        const medleys = await getAllMedleys();
        console.log('🏠 Homepage: Successfully fetched medleys:', medleys.length);

        return <HomePageClient initialMedleys={medleys} />;
    } catch (error) {
        console.error('🏠 Homepage: Error fetching medleys:', error);
        // Return with empty array on error to prevent 404
        return <HomePageClient initialMedleys={[]} />;
    }
}