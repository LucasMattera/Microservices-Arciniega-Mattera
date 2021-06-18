const express = require('express');
const {unqfy, saveUnqfy} = require('./saveAndLoadUNQfy');
const { errorHandler } = require('../apiErrors2');

const appArtist = express();
const router = express.Router();
router.use(express.json());

function getNotRecursiveAlbums(recursiveAlbumsList){
    let ret = [];
    
    recursiveAlbumsList.forEach(albumRec => 
        ret.push({album_name:albumRec.name, album_year:albumRec.year})
    );
        
    return ret;
}
    
function standardJSONOutput(artist){
        return {
            id: artist.id,
            name: artist.name,
            country: artist.country,
            albums: getNotRecursiveAlbums(artist.albums),
        }
}


appArtist.use('/artists', router);


router.route('/')
    .get((req, res) => { // GET /api/artists?name=
        const artist = unqfy.getInstanceByAttribute(req.query.name, 'artist', 'name');
        res.send(standardJSONOutput(artist));
    })
    .post((req, res, next) => { // POST /api/artists/ 
        const keys = Object.keys(req.body);
        if(keys.length > 1){
                const artist = unqfy.addArtist(req.body);
                saveUnqfy(unqfy);        
                res.status(201).send(standardJSONOutput(artist));            
        } else {
            next(new Error("MissingParameter"));
        }
    })
    
router.route('/:id')
    .get((req, res) => { // GET /api/artists/<id>
            const artist = unqfy.getInstanceByAttribute(req.params.id, 'artist', 'id', res);
            res.send(standardJSONOutput(artist));
    })
    .patch((req, res, next) => { // PATCH /api/artists/:id
        const keys = Object.keys(req.body); 
        if(keys.length > 1){
            const artist = unqfy.modifyInstance(req.params.id, 'artist', req.body);
            saveUnqfy(unqfy);
            res.send(standardJSONOutput(artist));
        } else {
            next(new Error("MissingParameter"));
        }
    })
    .delete((req,res, e) => {
        const artist = unqfy.getInstanceByAttribute(req.params.id, 'artist');
        unqfy.deleteArtist(artist);
        saveUnqfy(unqfy);
        res.status(204);
        res.send();
    })    

appArtist.use(errorHandler);

module.exports={appArtist: appArtist}  