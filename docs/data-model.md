# Product Data Model

This project now has a scalable persistence foundation for:

- watchlist items
- mood scan history
- recommendation feedback

## Auth strategy

The app currently uses Firebase Auth in the frontend. Product data is stored in Supabase using:

- `auth_user_id` for authenticated Firebase users
- `user_key` for both signed-in users and guest/device persistence

That lets the app store behavior before login and still scale into a richer profile system later.

## Tables

### `watchlist_items`

- one row per saved movie per user/device
- stores `movie_payload` as JSONB for fast iteration
- intended for:
  - watchlist sync across sessions
  - profile analytics
  - future collaborative filtering

### `mood_scan_events`

- one row per mood detection or explicit mood input
- stores:
  - mood chosen
  - detected emotion when camera inference is used
  - detection method: `camera`, `quiz`, `manual`, `custom`

This is the basis for:

- mood history
- recommendation quality analysis
- model evaluation against downstream engagement

### `recommendation_feedback`

- one row per user interaction with a recommendation
- action types:
  - `click`
  - `save`
  - `dismiss`
  - `like`
  - `dislike`

This is the basis for:

- learning-to-rank
- recommendation scoring
- user preference modeling

## Migration

Apply the SQL in:

- `supabase/migrations/001_app_data.sql`

## Current app integration

- watchlist reads local first, then syncs with Supabase
- mood detector logs scan events
- saving a movie logs recommendation feedback with action `save`

## Next recommended steps

- add Row Level Security policies in Supabase
- add profile tables and settings
- log recommendation impressions and clicks
- move TMDB fetches behind the backend API
