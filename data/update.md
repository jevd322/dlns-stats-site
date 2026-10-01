# DLNS Stats Updates

Welcome to the updates page! Here you'll find the latest changes and improvements to the DLNS Stats system.

## Recent Updates

### September 29, 2026 - New Team and Player Pages

The biggest update in a while! Both the Team and Player pages have been rebuilt from scratch.

**Team pages:**

- New team identity card with team logos
- Overview tab with recent form, hero usage and a team leaderboard
- Players tab with a roster timeline showing who played for the team and when
- Series tab listing every series the team has played

**Player pages:**

- Split into Overview, Heroes, Matches, Teams and Profile tabs
- Hero pool with per-hero stat tiles, rank badges and a hero-by-week matrix
- Damage, death and souls profiles, plus a trend chart and personal bests
- Teammates and opponents panels, and a team tenure timeline
- Reworked match table and a refreshed player-hero detail page

The Players and Teams list pages got a refresh too.

### September 25, 2026 - Night Shift 56 & 57

Added Night Shift 56 and 57, cleaned up some of the match data and fixed a few small bugs.

### September 14, 2026 - Replays and a New Home Page

- Replay buttons now prefer direct download links, and replay lookups are preloaded and cached so they show up much faster
- The home page has been redesigned: a new header, recent series grouped by week with a "Load more" button, a quick search box for players, teams and heroes, and a Twitch stream status strip in the site header when the stream is live
- The home page now loads about 88% less data on first visit
- Added Night Shift 55

### September 3, 2026 - Death Position Stats

We now record where every death happens relative to the middle of the map, for every player in every match. This lays the groundwork for future positioning stats.

Night Shift 54 was also added, along with replay files being wired up to the match pages.

### August 2026 - Match Page Overhaul

- Updated match scoreboard and match header
- Improved match graphs
- Started work on a proper mobile layout for match pages
- Added Night Shift 50 through 53

### July 2026 - Moving Everything to React

- The home, search, match, player, help, community and updates pages now all run on the new React frontend (old `/matches/...` and `/users/...` links still work)
- New week pages, an improved header, Steam avatars and a refreshed player list
- An editable help page and site banner for admins
- Removed a lot of old side-project pages that had nothing to do with stats
- Added Night Shift 45 through 49

### June 2026 - Interviews, Hero Picks and Polish

- New Interviews section, with short links for each interview
- Hero selection stats on the stats page
- Weekly stats across all events, plus event and series filters
- Replay lookups on match pages
- A proper 404 page and loading skeletons across the site
- Faster pages thanks to longer caching and lazy loading
- A basic mobile layout
- Added Night Shift 41 through 44

### March to May 2026 - The Big Rebuild

Most of the site was rebuilt on a new React frontend with a new colour scheme.

- New match, hero and player detail pages, with hero grid images, ability images and item images
- Match results now show builds, a match timeline graph and a souls graph
- Series and week pages, with VOD links
- An admin tool for submitting matches
- Expanded statistics page
- Full database API documentation
- Added Night Shift 37 through 40

## Old Updates

### October 6, 2025 - Discord Auth

Added in discord auth! 

This is for some backend things, but also to add possible future things.

### October 3, 2025 - Another set of HTML / CSS Changes

Coming today, user `jevd322` has gone through and changed the HTML for the Footer and Header. 

This will be the first set of possible changes on the HTML/CSS front, in hopefully a nicer design for any user.

Some more features are being worked on, so do keep an eye out!



### October 1, 2025 - HTML Overhaul!

Redid the entire frontend just as it sucked... Thats it

### September 30, 2025 - Small UI Changes

Just some smaller changes currently. 

- Fixed the search bar being cut off ( can still use /search page as intended)
- Nicer padding on the buttons ( base.html seen on all screens)

20:11 PM - Fixed the installer, didnt put it in the right directory ( placed one folder to high )

Some Later Time... - Started work on API documentation

### September 28, 2025 - Made it open source!

Due to some friends and people in the community asking, i have made the project open source!

What does this mean?

- The community can better help with adding features
- People can add issues onto the github page
- People can see the amount of chaos behind the scenes!

This does also mean people can run the website entirely themselves, which i hope they dont but i do hope they take inspiration!

### September 27, 2025 - Added Statistics Page

Its here! A nice statistics page with details on:

- Total Matches
- Total Players
- Total Kills
And More!

I was silly and forgot to push the stats page. Added now! - 1:37pm UK Time.

3:38 PM :

Added in hero names to all pages it was broken. Took me a while but we *should* now be working!

18:32 PM:

Fixed the next/prev buttons, User page not properly registering the multiple pages, Other backend changes.

20:40 PM:

Added a cache to the match search. Helps with preventing needing to research the same match multiple times.

21:20 PM:

Added a Community Tab - If you feel you fit in to the community as a creator or provider of something key to the game, reach out on discord! My username is `j0nesy_`, where I can be found in the Deadlock, Deadlock Modding, and DLNS servers.



### September 26, 2025 - Shot Statistics Added
Added shot hit/missed data to all matches from DLNS games. This data is now visible on:
- Match detail pages
- Player profile pages 
- Match history tables

Shot accuracy percentages are calculated and displayed on user profiles.

**Note**: Shot data is currently only available for DLNS matches. It may eventually be added to custom search functionality.

### Plans:
- Adding in Item buy progression throughout the match
- Showing final build in a match
- Better UX over whole site!


## Feedback & Suggestions

Have ideas for new features or improvements? Reach out to me on **Discord** ( j0nesy_ ) with the idea and I will see what i can do!

---

*More updates will be posted here as new features are added.*