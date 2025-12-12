-- Create study_groups table
CREATE TABLE IF NOT EXISTS public.study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  topic TEXT,
  meeting_day TEXT,
  meeting_time TEXT,
  location TEXT,
  is_public BOOLEAN DEFAULT true,
  max_members INTEGER,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Create group_posts table (for group discussions)
CREATE TABLE IF NOT EXISTS public.group_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_meetings table
CREATE TABLE IF NOT EXISTS public.group_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('online', 'offline')),
  meeting_date DATE NOT NULL,
  meeting_time TIME NOT NULL,
  location TEXT,
  online_link TEXT,
  duration_minutes INTEGER,
  max_attendees INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_meeting_attendees table
CREATE TABLE IF NOT EXISTS public.group_meeting_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.group_meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'attending' CHECK (status IN ('attending', 'maybe', 'not_attending')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(meeting_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_study_groups_created_by ON public.study_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_group_id ON public.group_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_author_id ON public.group_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_group_meetings_group_id ON public.group_meetings(group_id);
CREATE INDEX IF NOT EXISTS idx_group_meetings_created_by ON public.group_meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_group_meetings_date ON public.group_meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_group_meeting_attendees_meeting_id ON public.group_meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_group_meeting_attendees_user_id ON public.group_meeting_attendees(user_id);

-- Enable RLS
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_meeting_attendees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Anyone can view public groups" ON public.study_groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.study_groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON public.study_groups;
DROP POLICY IF EXISTS "Group creators can delete their groups" ON public.study_groups;

-- RLS Policies for study_groups
CREATE POLICY "Anyone can view public groups"
  ON public.study_groups FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create groups"
  ON public.study_groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update their groups"
  ON public.study_groups FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Group creators can delete their groups"
  ON public.study_groups FOR DELETE
  USING (auth.uid() = created_by);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Users can join public groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can manage members" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can update members" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can delete members" ON public.group_members;

-- RLS Policies for group_members
CREATE POLICY "Users can view group members"
  ON public.group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.study_groups
      WHERE study_groups.id = group_members.group_id
      AND (study_groups.is_public = true OR study_groups.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can join public groups"
  ON public.group_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.study_groups
      WHERE study_groups.id = group_id
      AND study_groups.is_public = true
    )
  );

CREATE POLICY "Users can leave groups"
  ON public.group_members FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Group creators can update members"
  ON public.group_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.study_groups
      WHERE study_groups.id = group_members.group_id
      AND study_groups.created_by = auth.uid()
    )
  );

CREATE POLICY "Group creators can delete members"
  ON public.group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.study_groups
      WHERE study_groups.id = group_members.group_id
      AND study_groups.created_by = auth.uid()
    )
  );

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view posts in accessible groups" ON public.group_posts;
DROP POLICY IF EXISTS "Group members can create posts" ON public.group_posts;
DROP POLICY IF EXISTS "Post authors can update their posts" ON public.group_posts;
DROP POLICY IF EXISTS "Post authors and admins can delete posts" ON public.group_posts;
DROP POLICY IF EXISTS "Post authors and group creators can delete posts" ON public.group_posts;

-- RLS Policies for group_posts
CREATE POLICY "Users can view posts in accessible groups"
  ON public.group_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.study_groups
      WHERE study_groups.id = group_posts.group_id
      AND (
        study_groups.is_public = true
        OR study_groups.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.group_members
          WHERE group_members.group_id = study_groups.id
          AND group_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Group members can create posts"
  ON public.group_posts FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_posts.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Post authors can update their posts"
  ON public.group_posts FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Post authors and group creators can delete posts"
  ON public.group_posts FOR DELETE
  USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM public.study_groups
      WHERE study_groups.id = group_posts.group_id
      AND study_groups.created_by = auth.uid()
    )
  );

-- Add slug column if it doesn't exist (using a more robust approach)
ALTER TABLE public.study_groups ADD COLUMN IF NOT EXISTS slug TEXT;

-- Function to generate a unique slug from group name
CREATE OR REPLACE FUNCTION public.generate_group_slug(group_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase, remove special chars, replace spaces with hyphens
  base_slug := lower(trim(group_name));
  base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  -- If empty after processing, use a default
  IF base_slug = '' THEN
    base_slug := 'group';
  END IF;
  
  final_slug := base_slug;
  
  -- Ensure uniqueness by appending a number if needed
  WHILE EXISTS (SELECT 1 FROM public.study_groups WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for existing groups that don't have one
UPDATE public.study_groups
SET slug = public.generate_group_slug(name)
WHERE slug IS NULL OR slug = '';

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_study_groups_slug_unique ON public.study_groups(slug);

-- Create index on slug for faster lookups (already covered by unique index, but keeping for clarity)
CREATE INDEX IF NOT EXISTS idx_study_groups_slug ON public.study_groups(slug);

-- Make slug NOT NULL after ensuring all existing rows have slugs
DO $$
BEGIN
  ALTER TABLE public.study_groups ALTER COLUMN slug SET NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's an error, log it but don't fail
    RAISE NOTICE 'Could not set slug to NOT NULL: %', SQLERRM;
END $$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_group_created ON public.study_groups;
DROP TRIGGER IF EXISTS generate_group_slug_trigger ON public.study_groups;
DROP TRIGGER IF EXISTS update_study_groups_updated_at ON public.study_groups;
DROP TRIGGER IF EXISTS update_group_posts_updated_at ON public.group_posts;
DROP TRIGGER IF EXISTS update_group_meetings_updated_at ON public.group_meetings;

-- Function to generate slug before insert
CREATE OR REPLACE FUNCTION public.generate_group_slug_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate slug if not provided
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_group_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to generate slug before insert
CREATE TRIGGER generate_group_slug_trigger
  BEFORE INSERT ON public.study_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_group_slug_trigger();

-- Function to automatically add creator as admin member
CREATE OR REPLACE FUNCTION public.add_group_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT (group_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add creator as admin
CREATE TRIGGER on_group_created
  AFTER INSERT ON public.study_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.add_group_creator_as_admin();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_study_groups_updated_at
  BEFORE UPDATE ON public.study_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_posts_updated_at
  BEFORE UPDATE ON public.group_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_meetings_updated_at
  BEFORE UPDATE ON public.group_meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view meetings in accessible groups" ON public.group_meetings;
DROP POLICY IF EXISTS "Group members can create meetings" ON public.group_meetings;
DROP POLICY IF EXISTS "Meeting creators and admins can update meetings" ON public.group_meetings;
DROP POLICY IF EXISTS "Meeting creators and group creators can update meetings" ON public.group_meetings;
DROP POLICY IF EXISTS "Meeting creators and admins can delete meetings" ON public.group_meetings;
DROP POLICY IF EXISTS "Meeting creators and group creators can delete meetings" ON public.group_meetings;

-- RLS Policies for group_meetings
CREATE POLICY "Users can view meetings in accessible groups"
  ON public.group_meetings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.study_groups
      WHERE study_groups.id = group_meetings.group_id
      AND (
        study_groups.is_public = true
        OR study_groups.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.group_members
          WHERE group_members.group_id = study_groups.id
          AND group_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Group members can create meetings"
  ON public.group_meetings FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_meetings.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Meeting creators and group creators can update meetings"
  ON public.group_meetings FOR UPDATE
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.study_groups
      WHERE study_groups.id = group_meetings.group_id
      AND study_groups.created_by = auth.uid()
    )
  );

CREATE POLICY "Meeting creators and group creators can delete meetings"
  ON public.group_meetings FOR DELETE
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.study_groups
      WHERE study_groups.id = group_meetings.group_id
      AND study_groups.created_by = auth.uid()
    )
  );

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view attendees for accessible meetings" ON public.group_meeting_attendees;
DROP POLICY IF EXISTS "Group members can RSVP to meetings" ON public.group_meeting_attendees;
DROP POLICY IF EXISTS "Users can update their own RSVP" ON public.group_meeting_attendees;
DROP POLICY IF EXISTS "Users can remove their own RSVP" ON public.group_meeting_attendees;

-- RLS Policies for group_meeting_attendees
CREATE POLICY "Users can view attendees for accessible meetings"
  ON public.group_meeting_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_meetings
      JOIN public.study_groups ON study_groups.id = group_meetings.group_id
      WHERE group_meetings.id = group_meeting_attendees.meeting_id
      AND (
        study_groups.is_public = true
        OR study_groups.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.group_members
          WHERE group_members.group_id = study_groups.id
          AND group_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Group members can RSVP to meetings"
  ON public.group_meeting_attendees FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.group_meetings
      JOIN public.group_members ON group_members.group_id = group_meetings.group_id
      WHERE group_meetings.id = group_meeting_attendees.meeting_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own RSVP"
  ON public.group_meeting_attendees FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can remove their own RSVP"
  ON public.group_meeting_attendees FOR DELETE
  USING (auth.uid() = user_id);
