// server.js - Node.js/Express backend for film management
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const FILMS_FILE = path.join(__dirname, 'films.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files from public directory

// Initialize films file if it doesn't exist
async function initializeFilmsFile() {
    try {
        await fs.access(FILMS_FILE);
    } catch (error) {
        // File doesn't exist, create it with sample data
        const sampleFilms = [
            {
                id: "1",
                title: "Take me to the beginning...",
                description: "A short film shot on Father's Day",
                duration: 250,
                videoURL: "https://player.vimeo.com/progressive_redirect/playback/1093810557/rendition/2160p/file.mp4?loc=external&log_user=0&signature=e0d06e6c69d487b27167484b41e85f2f709951e9c4f8128d6801ec187c512cc2",
                genre: "Family",
                year: 2025,
                thumbnailURL: "https://i.postimg.cc/ryDjX06C/Fathers-Day.png",
                posterURL: "https://i.postimg.cc/ryDjX06C/Fathers-Day.png",
                isVimeoVideo: false,
                dateAdded: new Date().toISOString()
            },
            {
                id: "2",
                title: "Edelman Fossil Park",
                description: "A surreal short film showcasing high-quality video streaming capabilities.",
                duration: 210,
                videoURL: "https://player.vimeo.com/progressive_redirect/playback/1089554187/rendition/2160p/file.mp4?loc=external&log_user=0&signature=2f0b5f7057477bd0cf678f9ae6994a93bde3f5dcf46f610e21ea5c32657c7eb0",
                genre: "Family",
                year: 2025,
                thumbnailURL: "https://i.postimg.cc/13hJK9j0/thumb.jpg",
                posterURL: "https://i.postimg.cc/13hJK9j0/thumb.jpg",
                isVimeoVideo: false,
                dateAdded: new Date().toISOString()
            }
        ];
        await fs.writeFile(FILMS_FILE, JSON.stringify(sampleFilms, null, 2));
    }
}

// Helper function to read films from file
async function readFilms() {
    try {
        const data = await fs.readFile(FILMS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading films:', error);
        return [];
    }
}

// Helper function to write films to file
async function writeFilms(films) {
    try {
        await fs.writeFile(FILMS_FILE, JSON.stringify(films, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing films:', error);
        return false;
    }
}

// Generate unique ID
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Validate film data
function validateFilm(film) {
    const required = ['title', 'description', 'videoURL', 'genre', 'year', 'thumbnailURL'];
    const missing = required.filter(field => !film[field]);
    
    if (missing.length > 0) {
        return { valid: false, error: `Missing required fields: ${missing.join(', ')}` };
    }
    
    if (typeof film.year !== 'number' || film.year < 1900 || film.year > new Date().getFullYear() + 5) {
        return { valid: false, error: 'Year must be a valid number between 1900 and current year + 5' };
    }
    
    if (typeof film.duration !== 'number' || film.duration <= 0) {
        return { valid: false, error: 'Duration must be a positive number (in seconds)' };
    }
    
    try {
        new URL(film.videoURL);
        new URL(film.thumbnailURL);
        if (film.posterURL) new URL(film.posterURL);
    } catch (error) {
        return { valid: false, error: 'Invalid URL format' };
    }
    
    return { valid: true };
}

// Routes

// GET /api/films - Get all films
app.get('/api/films', async (req, res) => {
    try {
        const films = await readFilms();
        res.json({
            success: true,
            films: films,
            count: films.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch films'
        });
    }
});

// GET /api/films/:id - Get specific film
app.get('/api/films/:id', async (req, res) => {
    try {
        const films = await readFilms();
        const film = films.find(f => f.id === req.params.id);
        
        if (!film) {
            return res.status(404).json({
                success: false,
                error: 'Film not found'
            });
        }
        
        res.json({
            success: true,
            film: film
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch film'
        });
    }
});

// POST /api/films - Add new film
app.post('/api/films', async (req, res) => {
    try {
        const filmData = req.body;
        
        // Validate input
        const validation = validateFilm(filmData);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: validation.error
            });
        }
        
        // Read current films
        const films = await readFilms();
        
        // Create new film object
        const newFilm = {
            id: generateId(),
            title: filmData.title.trim(),
            description: filmData.description.trim(),
            duration: Number(filmData.duration),
            videoURL: filmData.videoURL.trim(),
            genre: filmData.genre.trim(),
            year: Number(filmData.year),
            thumbnailURL: filmData.thumbnailURL.trim(),
            posterURL: filmData.posterURL ? filmData.posterURL.trim() : filmData.thumbnailURL.trim(),
            isVimeoVideo: filmData.videoURL.includes('vimeo.com') || filmData.videoURL.includes('player.vimeo.com'),
            dateAdded: new Date().toISOString()
        };
        
        // Add to films array
        films.unshift(newFilm); // Add to beginning for newest first
        
        // Save to file
        const saved = await writeFilms(films);
        if (!saved) {
            throw new Error('Failed to save film');
        }
        
        res.status(201).json({
            success: true,
            message: 'Film added successfully',
            film: newFilm
        });
        
    } catch (error) {
        console.error('Error adding film:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add film'
        });
    }
});

// PUT /api/films/:id - Update film
app.put('/api/films/:id', async (req, res) => {
    try {
        const films = await readFilms();
        const filmIndex = films.findIndex(f => f.id === req.params.id);
        
        if (filmIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Film not found'
            });
        }
        
        const validation = validateFilm(req.body);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: validation.error
            });
        }
        
        // Update film
        const updatedFilm = {
            ...films[filmIndex],
            title: req.body.title.trim(),
            description: req.body.description.trim(),
            duration: Number(req.body.duration),
            videoURL: req.body.videoURL.trim(),
            genre: req.body.genre.trim(),
            year: Number(req.body.year),
            thumbnailURL: req.body.thumbnailURL.trim(),
            posterURL: req.body.posterURL ? req.body.posterURL.trim() : req.body.thumbnailURL.trim(),
            isVimeoVideo: req.body.videoURL.includes('vimeo.com') || req.body.videoURL.includes('player.vimeo.com'),
            lastModified: new Date().toISOString()
        };
        
        films[filmIndex] = updatedFilm;
        
        const saved = await writeFilms(films);
        if (!saved) {
            throw new Error('Failed to save film');
        }
        
        res.json({
            success: true,
            message: 'Film updated successfully',
            film: updatedFilm
        });
        
    } catch (error) {
        console.error('Error updating film:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update film'
        });
    }
});

// DELETE /api/films/:id - Delete film
app.delete('/api/films/:id', async (req, res) => {
    try {
        const films = await readFilms();
        const filmIndex = films.findIndex(f => f.id === req.params.id);
        
        if (filmIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Film not found'
            });
        }
        
        const deletedFilm = films.splice(filmIndex, 1)[0];
        
        const saved = await writeFilms(films);
        if (!saved) {
            throw new Error('Failed to save changes');
        }
        
        res.json({
            success: true,
            message: 'Film deleted successfully',
            film: deletedFilm
        });
        
    } catch (error) {
        console.error('Error deleting film:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete film'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Film API is running',
        timestamp: new Date().toISOString()
    });
});

// Serve the web frontend at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Initialize and start server
async function startServer() {
    await initializeFilmsFile();
    
    app.listen(PORT, () => {
        console.log(`🎬 Film Management API running on port ${PORT}`);
        console.log(`📱 API endpoint: http://localhost:${PORT}/api/films`);
        console.log(`🌐 Web interface: http://localhost:${PORT}`);
    });
}

startServer().catch(console.error);

module.exports = app;