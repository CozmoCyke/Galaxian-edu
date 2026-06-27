# Galaxian-Edu

Local offline copy of the **Galaxians** HTML5 game, originally published at:

<https://studio2.org.uk/c2/Galaxians/>

## Project Structure

```
C:\dev\galaxian-edu\
├── original\              # Exact copies of all downloaded files (pristine)
├── app\                   # Working local copy (ready to serve)
├── tools\                 # Utility scripts (server, audit)
├── reports\               # Download report, asset manifest, network audit
├── start-galaxian-edu.cmd # Windows launcher (batch)
├── start-galaxian-edu.ps1 # Windows launcher (PowerShell)
└── README.md
```

## How to Run

### PowerShell
```powershell
.\start-galaxian-edu.ps1
```

### Command Prompt
```cmd
start-galaxian-edu.cmd
```

### Directly
```cmd
python tools\serve.py
```

The server starts on `http://127.0.0.1:8080/` (or next free port) and opens
the game in your default browser.

## Requirements

- **Python 3.x** (for the local HTTP server)
- A modern web browser (Chrome, Firefox, Edge, etc.)

## Offline

All files are stored locally. No Internet connection is needed after download.

## License & Credits

This is an archival copy of a freely available web game. The original game was
created with **Construct 2** (Scirra Ltd.). The original author retains all
rights. See `reports/DOWNLOAD_REPORT.md` for details.
