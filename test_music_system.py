import urllib.request
import urllib.error
import json
import uuid
import time

BASE_URL = "http://localhost:8000/api"

def print_header(title):
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}")

def print_step(step):
    print(f"\n🔵 {step}")

def post(endpoint, data):
    url = f"{BASE_URL}{endpoint}"
    try:
        req = urllib.request.Request(url)
        req.add_header('Content-Type', 'application/json')
        jsondata = json.dumps(data).encode('utf-8')
        req.add_header('Content-Length', len(jsondata))
        
        response = urllib.request.urlopen(req, jsondata)
        res_body = response.read().decode('utf-8')
        
        try:
            return json.loads(res_body)
        except json.JSONDecodeError:
            return res_body
            
    except urllib.error.HTTPError as e:
        print(f"❌ Request failed: {e}")
        print(f"   Status: {e.code}")
        print(f"   Reason: {e.reason}")
        try:
            err_body = e.read().decode('utf-8')
            print(f"   Response: {err_body}")
        except:
            pass
        return None
    except urllib.error.URLError as e:
        print(f"❌ Connection failed: {e.reason}")
        return None

def load_curated_songs():
    try:
        with open('data/songs.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("⚠️ data/songs.json not found. Using empty list.")
        return []

def ensure_song_exists(song_data):
    # Search first
    # print(f"  Checking for '{song_data['title']}'...")
    search_res = post("/Song/_searchByTitleOrArtist", {"query": song_data['title']})
    
    found_song = None
    if search_res and "songs" in search_res:
        for item in search_res["songs"]:
            s = item["song"]
            if s["title"] == song_data["title"] and s["artist"] == song_data["artist"]:
                found_song = s
                # print(f"    Found existing: {s['_id']}")
                break
    
    if not found_song:
        print(f"    Not found. Creating '{song_data['title']}'...")
        create_data = {
            "title": song_data["title"],
            "artist": song_data["artist"],
            "chords": song_data["chords"],
            "genre": song_data.get("tags", ["Unknown"])[0] if song_data.get("tags") else "Unknown",
            "difficulty": song_data.get("difficulty"),
            "key": song_data.get("key"),
            "tempo": song_data.get("tempo"),
            "tags": song_data.get("tags"),
            "sections": song_data.get("sections"),
            "source": song_data.get("source")
        }
        
        res = post("/Song/createSong", create_data)
        if res and "song" in res:
            found_song = res["song"]
            print(f"    ✅ Created: {found_song['_id']}")
        else:
            print(f"    ❌ Failed to create: {res}")
            
    return found_song

def run_test():
    print_header("Starting Music System API Test")

    # 1. Register and Login
    print_step("Registering new user...")
    username = f"music_tester_{uuid.uuid4().hex[:8]}"
    password = "password123"
    
    reg_data = {
        "username": username,
        "email": f"{username}@example.com",
        "password": password,
        "isKidAccount": False
    }
    reg_res = post("/UserAccount/register", reg_data)
    if not reg_res or "user" not in reg_res:
        print("❌ Registration failed. Aborting.")
        return

    print_step("Logging in...")
    login_data = {"username": username, "password": password}
    login_res = post("/UserAccount/login", login_data)
    if not login_res or "sessionId" not in login_res:
        print("❌ Login failed. Aborting.")
        return
    
    session_id = login_res["sessionId"]
    user_id = login_res["user"]
    print(f"✅ Logged in. Session ID: {session_id}")

    # 2. Initialize Libraries
    print_step("Initializing ChordLibrary and SongLibrary...")
    post("/ChordLibrary/addUser", {"sessionId": session_id})
    post("/SongLibrary/addUser", {"sessionId": session_id})

    # 3. Test ChordLibrary
    print_step("Adding Chords to Inventory...")
    chords_to_add = ["C", "G", "Am", "F"]
    for chord in chords_to_add:
        res = post("/ChordLibrary/addChordToInventory", {
            "sessionId": session_id,
            "chord": chord,
            "mastery": "in progress"
        })
        if res is not None and "error" not in res:
            print(f"  ✅ Added {chord}")
        else:
            print(f"  ❌ Failed to add {chord}: {res}")

    print_step("Verifying Known Chords...")
    known_chords_res = post("/ChordLibrary/_getKnownChords", {"sessionId": session_id})
    if known_chords_res and "knownChords" in known_chords_res:
        known = [c["chord"] for c in known_chords_res["knownChords"]]
        print(f"  Known Chords: {known}")
        if set(known) == set(chords_to_add):
            print("  ✅ Known chords match expected.")
        else:
            print("  ❌ Known chords mismatch.")
    else:
        print("  ❌ Failed to get known chords.")

    print_step("Updating Chord Mastery...")
    post("/ChordLibrary/updateChordMastery", {
        "sessionId": session_id,
        "chord": "C",
        "newMastery": "mastered"
    })
    
    mastery_res = post("/ChordLibrary/_getChordMastery", {
        "sessionId": session_id,
        "chord": "C"
    })
    # Fix: mastery_res is {'mastery': [{'mastery': 'mastered'}]}
    if mastery_res and "mastery" in mastery_res and isinstance(mastery_res["mastery"], list) and len(mastery_res["mastery"]) > 0:
        current_mastery = mastery_res["mastery"][0].get("mastery")
        if current_mastery == "mastered":
            print("  ✅ Chord mastery updated to 'mastered'.")
        else:
            print(f"  ❌ Mastery mismatch: {current_mastery}")
    else:
        print(f"  ❌ Failed to update mastery: {mastery_res}")

    # 4. Seed Curated Songs
    print_step("Seeding Curated Songs from data/songs.json...")
    curated_songs = load_curated_songs()
    print(f"  Loaded {len(curated_songs)} songs from file.")
    
    db_songs = []
    for s_data in curated_songs:
        s = ensure_song_exists(s_data)
        if s:
            db_songs.append(s)
    print(f"  ✅ Verified/Seeded {len(db_songs)} songs in database.")

    # 5. Test Playable Songs (Dynamic Check)
    print_step("Checking Playable Songs...")
    # User knows C, G, Am, F
    # "Four Chord Journey" uses C, G, Am, F -> Should be playable
    # "Sunrise Groove" uses G, C, D -> Needs D -> Not playable
    
    playable_res = post("/Song/_getPlayableSongs", {"sessionId": session_id})
    
    target_song = None
    # Find "Four Chord Journey" in db_songs
    four_chord_journey = next((s for s in db_songs if s["title"] == "Four Chord Journey"), None)
    
    if playable_res and "songs" in playable_res:
        playable_ids = [s.get("id") or s.get("_id") or s.get("song", {}).get("_id") for s in playable_res["songs"]]
        print(f"  Playable Songs Count: {len(playable_ids)}")
        
        if four_chord_journey:
            if four_chord_journey["_id"] in playable_ids:
                print(f"  ✅ '{four_chord_journey['title']}' is playable (we know all chords).")
                target_song = four_chord_journey
            else:
                print(f"  ❌ '{four_chord_journey['title']}' NOT playable (should be).")
        else:
            print("  ⚠️ 'Four Chord Journey' not found in DB songs.")
    else:
        print(f"  ❌ Failed to get playable songs: {playable_res}")
    
    if target_song:
        # 6. Test SongLibrary (Learning)
        print_step(f"Start Learning Song '{target_song['title']}'...")
        start_res = post("/SongLibrary/startLearningSong", {
            "sessionId": session_id,
            "song": target_song["_id"],
            "mastery": "in-progress"
        })
        if start_res is not None and "error" not in start_res:
            print("  ✅ Started learning.")
        else:
            print(f"  ❌ Failed to start learning: {start_res}")

        print_step("Verifying Songs In Progress...")
        progress_res = post("/SongLibrary/_getSongsInProgress", {"sessionId": session_id})
        if progress_res and "songs" in progress_res:
            in_progress_ids = [s["song"]["_id"] for s in progress_res["songs"]]
            if target_song["_id"] in in_progress_ids:
                print("  ✅ Song found in progress list.")
            else:
                print("  ❌ Song NOT found in progress list.")
        else:
            print(f"  ❌ Failed to get songs in progress: {progress_res}")
        
        print_step("Updating Song Mastery...")
        post("/SongLibrary/updateSongMastery", {
            "sessionId": session_id,
            "song": target_song["_id"],
            "newMastery": "mastered"
        })
        
        # Verify update
        progress_res_2 = post("/SongLibrary/_getSongsInProgress", {"sessionId": session_id})
        if progress_res_2 and "songs" in progress_res_2:
            entry = next((s for s in progress_res_2["songs"] if s["song"]["_id"] == target_song["_id"]), None)
            if entry and entry["mastery"] == "mastered":
                print("  ✅ Song mastery updated.")
            else:
                print("  ❌ Song mastery update failed.")
        else:
            print(f"  ❌ Failed to get songs in progress (2): {progress_res_2}")

        print_step("Stop Learning Song...")
        post("/SongLibrary/stopLearningSong", {
            "sessionId": session_id,
            "song": target_song["_id"]
        })
        
        progress_res_3 = post("/SongLibrary/_getSongsInProgress", {"sessionId": session_id})
        if progress_res_3 and "songs" in progress_res_3:
             in_progress_ids = [s["song"]["_id"] for s in progress_res_3["songs"]]
             if target_song["_id"] not in in_progress_ids:
                 print("  ✅ Song removed from progress.")
             else:
                 print("  ❌ Song still in progress.")
        else:
             print(f"  ❌ Failed to get songs in progress (3): {progress_res_3}")

    # 7. Test RecommendationEngine
    print_step("Testing Recommendation Engine...")
    
    print_step("Requesting Chord Recommendation...")
    # Stateless request
    known_chords_list = ["C", "G", "Am", "F"]
    chord_rec_res = post("/RecommendationEngine/requestChordRecommendation", {
        "knownChords": known_chords_list
    })
    print(f"  Chord Recommendation: {chord_rec_res}")

    print_step("Requesting Personalized Song Recommendation...")
    # This one DOES require session.
    pers_rec_res = post("/RecommendationEngine/requestPersonalizedSongRecommendation", {
        "sessionId": session_id
    })
    print(f"  Personalized Songs: {pers_rec_res}")

    if target_song:
        print_step(f"Recommend Next Chords for Target Song '{target_song['title']}'...")
        next_chords_res = post("/RecommendationEngine/recommendNextChordsForTargetSong", {
            "sessionId": session_id,
            "targetSong": target_song["_id"]
        })
        print(f"  Next Chords: {next_chords_res}")

    print_step("Calculate Recommendation (Heavy)...")
    calc_res = post("/RecommendationEngine/calculateRecommendation", {
        "sessionId": session_id
    })
    print(f"  Calculation Result: {calc_res}")
    
    if calc_res and "recommendationId" in calc_res:
        rec_id = calc_res["recommendationId"]
        print_step(f"Fetching Recommendation Details ({rec_id})...")
        get_rec_res = post("/RecommendationEngine/_getRecommendation", {
            "recommendationId": rec_id
        })
        print(f"  Recommendation Details: {get_rec_res}")

    print_header("Test Complete")

if __name__ == "__main__":
    run_test()
