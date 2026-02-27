# analytics-dashboard-

This project is a simple observation viewer dashboard. The frontend web client uses a custom web component defined in `frontend /js/app.js` and related modules.

## Frontend structure

Files have been organized by functionality under `frontend /js/modules/`:

- **search.js** – helpers for building API URLs and fetching JSON payloads (now supports imaging lookups with full date/time including seconds, plus CMD SSAR start/end range searches)
- **render.js** – DOM helpers for rendering search results, pagination controls, and session timelines
- **timeline.js** – utilities to draw session coverage timelines and time conversions

The root component (`observations-app`) lives in `frontend /js/app.js` and imports these modules.  The search box offers multiple filter types (observation ID, session ID, configuration, imaging timestamp and CMD SSAR time range), and results tables default to showing key columns (REFOBS ID, SSAR config, session, CMD start/end) with a "Show More" button for the remainder.

## Backend structure

To mirror the front‑end refactor, the Flask server has been decomposed as well:

- **`db.py`** – database connection helper
- **`utils.py`** – general-purpose helpers such as page parsing and regex building
- **`filters.py`** – encapsulates filtering logic used by the `/api/session` and `/api/observation` endpoints

`backend/app.py` now focuses on routing and delegates work to these modules, resulting in cleaner, testable code.

## Running the project

1. **Install dependencies** (requires Python 3):

   ```bash
   python3 -m pip install --user flask
   ```

   *`sqlite3` is part of the standard library and no additional install is needed.*

2. **Populate the database** using the XML source file:

   ```bash
   cd backend
   python3 db_script.py
   ```

   This creates `backend/cop_endpoints_db` with observation and session tables.

3. **Start the server**:

   You can run the Flask app in one of two ways:

   ```bash
   # option A: run as a script from the backend directory
   cd backend
   python3 app.py

   # option B: run as a package from project root
   python3 -m backend.app
   ```

   By default it listens on `0.0.0.0:3000` in debug mode.

   The absolute imports in `app.py`, `filters.py` and `utils.py` ensure both approaches work.

4. **Open the frontend** in your browser at:

   > http://localhost:3000/

   The backend serves static assets (`/css` and `/js`), so no separate web server is needed.

> 🔧 You can re‑run `db_script.py` if `db.xml` is updated. The server will automatically reload when restarted thanks to Flask's debug mode.

