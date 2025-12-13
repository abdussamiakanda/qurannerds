-- Create reading_progress table to track user's reading progress
CREATE TABLE IF NOT EXISTS public.reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('quran', 'hadith')),
  surah_number INTEGER, -- For Quran (1-114)
  hadith_collection TEXT, -- For Hadith (e.g., 'bukhari', 'muslim')
  hadith_number INTEGER, -- For Hadith
  ayah_number INTEGER, -- For Quran (specific ayah)
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed BOOLEAN DEFAULT false,
  audio_position REAL DEFAULT 0, -- Audio playback position in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, content_type, surah_number, hadith_collection, hadith_number, ayah_number)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON public.reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_content_type ON public.reading_progress(content_type);
CREATE INDEX IF NOT EXISTS idx_reading_progress_last_read ON public.reading_progress(last_read_at DESC);

-- Enable RLS
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own progress
CREATE POLICY "Users can view their own reading progress"
  ON public.reading_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert their own reading progress"
  ON public.reading_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update their own reading progress"
  ON public.reading_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own progress
CREATE POLICY "Users can delete their own reading progress"
  ON public.reading_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reading_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_reading_progress_timestamp
  BEFORE UPDATE ON public.reading_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_reading_progress_updated_at();
