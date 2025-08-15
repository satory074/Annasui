-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create medleys table
CREATE TABLE IF NOT EXISTS public.medleys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    video_id VARCHAR(20) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    creator TEXT,
    duration INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create songs table
CREATE TABLE IF NOT EXISTS public.songs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    medley_id UUID NOT NULL REFERENCES public.medleys(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    artist TEXT,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    color VARCHAR(50) NOT NULL,
    genre TEXT,
    original_link TEXT,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_medleys_video_id ON public.medleys(video_id);
CREATE INDEX IF NOT EXISTS idx_songs_medley_id ON public.songs(medley_id);
CREATE INDEX IF NOT EXISTS idx_songs_order_index ON public.songs(order_index);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_medleys_updated_at 
    BEFORE UPDATE ON public.medleys 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_songs_updated_at 
    BEFORE UPDATE ON public.songs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.medleys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access on medleys" ON public.medleys
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access on songs" ON public.songs
    FOR SELECT USING (true);

-- For now, allow public insert/update (we'll restrict this later with authentication)
CREATE POLICY "Allow public insert on medleys" ON public.medleys
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on medleys" ON public.medleys
    FOR UPDATE USING (true);

CREATE POLICY "Allow public insert on songs" ON public.songs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on songs" ON public.songs
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on songs" ON public.songs
    FOR DELETE USING (true);