const picklify = require('picklify');
const fs = require('fs');
const { Playlist } = require('./src/domain-classes/playlist');
const { Album } = require('./src/domain-classes/album');
const { Track } = require('./src/domain-classes/track');
const { TrackList } = require('./src/domain-classes/tracklist');
const { Artist } = require('./src/domain-classes/artist');
const { User } = require('./src/domain-classes/user');
const { InstanceDoesNotExist,
        InstanceAlreadyExist,
        InstanceRequestedByIndirectAttributeDoesNotExist } = require('./src/errors');
const artist = require('./src/domain-classes/artist');
const albumBelongs = require('./src/belongs-classes/albumBelongs');
const trackBelongs = require('./src/belongs-classes/trackBelongs');
const { ArtistBelongs } = require('./src/belongs-classes/artistBelongs');
const { AlbumBelongs } = require('./src/belongs-classes/albumBelongs');
const { PlaylistBelongs } = require('./src/belongs-classes/playlistBelongs');
const { TrackBelongs } = require('./src/belongs-classes/trackBelongs');
const { UserBelongs } = require('./src/belongs-classes/userBelongs');
const { isRegExp } = require('util');
const { type } = require('os');
const {mmGetLyrics} = require('./src/API/musixmatch/musixMatchClient');
const {getAllArtistAlbums} = require('./src/API/spotify/spotifyClient');
const album = require('./src/domain-classes/album');
const Subject = require('./src/observer/subject');
const LoggingObserver = require('./src/observer/loggingObserver');
const LoggingClient = require('./src/clients/Logging/LoggingClient');
const NewsletterObserver = require('./src/observer/newsletterObserver');
const NewsletterClient = require('./src/clients/NewsletterClient');

class UNQfy extends Subject{
	constructor(){
        super();
		this.artists = [];
		this.tracks = [];
		this.playlists = [];
		this.albums = [];
		this.users = [];
		this.artistIdGenerator = 0;
		this.trackIdGenerator = 0;
		this.playlistIdGenerator = 0;
		this.albumIdGenerator = 0;
		this.userIdGenerator = 0;
		this.addObserver(new LoggingObserver);
		this.addObserver(new NewsletterObserver);
	}

	getArtists(){ return this.artists; }
	getAlbums(){ return this.albums; }
	getUsers(){ return this.users; }
  
  addArtist(artistData) {
		if(artistData.name != undefined && artistData.country != undefined){
    	    const artistBelongs = new ArtistBelongs(this.artists)
			if(!artistBelongs.execute(artistData)){
				const artist = 
					new Artist(
						this.getAndIncrementId('artist'), 
						artistData.name, 
						artistData.country
					)
				this.artists.push(artist);
				this.notify("newArtist",{changedObject: artist});
				return artist;
			} else {
				throw new InstanceAlreadyExist('artist', artistData.name);
			}
		} else {
			throw new Error("InvalidInputKey");
		}
	}
	
    addAlbum(artistId, albumData) {
        if(artistId != undefined && albumData.name != undefined && albumData.year != undefined){
		
			const albumBelongs = new AlbumBelongs(this.albums);

        	if(!albumBelongs.execute(albumData)){
        	    const album = 
        	        new Album(
        	            this.getAndIncrementId('album'),
        	            albumData.name,
        	            this.getInstanceByAttribute(artistId, 'artist'),
        	            albumData.year
        	        );
					
        	    const artist = this.getInstanceByAttribute(artistId, 'artist');
        	    artist.addAlbum(album);
        	    this.albums.push(album);
				this.notify("newAlbum",{changedObject:album, artist: artist});
        	    return album;
        	} else{
        	    throw new InstanceAlreadyExist('album', albumData.name);
        	}
		} else {
			throw new Error("InvalidInputKey");
		}
	}

	addTrack(albumId, trackData) {
        const trackBelongs = new TrackBelongs(this.tracks);
        const album = this.getInstanceByAttribute(albumId, 'album');
        const artist = album.getArtist();

        if(!trackBelongs.execute(trackData)){
            const track = 
                new Track(
                    this.getAndIncrementId('track'),
                    trackData.name,
                    trackData.duration,
                    album,
                    trackData.genres,
                    artist
                );
            
            album.addTrack(track);
            this.tracks.push(track);
            artist.addGenres(trackData.genres);
			this.notify("newTrack",{changedObject:track});
            return track;
        } else {
            throw new InstanceAlreadyExist("track", trackData.name);
        }
    }

	getTracksMatchingGenres(genres) {
		let res = [];
        this.tracks.map(track => {
            for(let genre of genres){
                if(track.genres.includes(genre)){
                    res.push(track);
                }
            }
        })
		const res1 = new Set(res)
		let result = [...res1]
		return result;
	}

	getTracksMatchingArtist(artistName) {
        if(this.artists.some(artist => artist.name === artistName)){
            const artist = this.artists.find(artist => artist.name === artistName);
            let allTracks = [];
            artist.albums.map(album => allTracks.push(...album.tracks))
		    return allTracks;
        }
		else{
			throw new InstanceDoesNotExist('artist', artistName);
		}
	}

	getMatchingParcial(stringParcial){
		
		let matchingByArtist = this.artists.filter(artist => artist.name.match(stringParcial))/* artist.name.match(/stringParcial/gi) */
		let matchingByAlbum = this.albums.filter(album => album.name.match(stringParcial))
		let matchingByTrack = this.tracks.filter(track => track.name.match(stringParcial))
		
		let resMatching = [...matchingByArtist, ...matchingByAlbum, ...matchingByTrack]
		
		return(resMatching)
	}
	
	createPlaylistFromTracks(name,trackIds){
		if(name != undefined && trackIds != undefined){
			try {
				if(!playlistBelongs.execute(name)){
					let tracks = [];
					let duration = 0;
					let genres = [];
					trackIds.forEach(trackId => {
						const track=this.getInstanceByAttribute(trackId, "track");
						tracks.push(track);
						duration += parseInt(track.duration);
						genres.concat(track.genres);
					});
					let playlist = new Playlist(
						this.getAndIncrementId('playlist'),
						name,
						tracks,
						genres,
						duration,
						null
					);
					this.playlists.push(playlist);
					return playlist;
				}
			} catch(instanceDoesNotExists){
				throw instanceDoesNotExists;
			}
		} else {
			throw new Error("InvalidInputKey");
		}
	}
	createPlaylist(name, user=null, maxDuration, genresToInclude){
		if(name != undefined && maxDuration != undefined && genresToInclude != undefined){

			let matchedTracks = this.getTracksMatchingGenres(genresToInclude);
			let durationLimit = maxDuration;
			let playlistTracks = [];
			let totalDuration = 0;

			while(durationLimit>0 && matchedTracks.length>0){
				let randomN = Math.floor(Math.random() * matchedTracks.length);
				let randomTrack= matchedTracks[randomN];

				matchedTracks =	matchedTracks.filter( track => 
					track.name !== randomTrack.name
				);
				
				if(durationLimit - randomTrack.duration>=0){
					playlistTracks.push(randomTrack);
					durationLimit = durationLimit - randomTrack.duration;
					totalDuration += parseInt(randomTrack.duration);
				}		
			}
		
			let playlist = new Playlist(
								this.getAndIncrementId('playlist'),
								name,
								playlistTracks,
								genresToInclude,
								totalDuration,
                                user
							);
			this.playlists.push(playlist);
			return playlist;
		 } else {
			throw new Error("InvalidInputKey");
		}
	}

	createUser(userName){
		if(!new UserBelongs(this.users).execute(userName)){
			let id = this.getAndIncrementId('user');
			let newser = new User(
				id,
			 	userName
			)
		   	this.users.push(newser);
			return newser;
		} 
		else {
			 throw new InstanceAlreadyExist('user', userName);
		}
    }

	getUser(userToSearch){ // se puede reemplazar por getInstanceByAttribute
		let userName = userToSearch.name;
		if(this.users.some(user => user.name == userName)){
			return this.users.find(u => u.name == userName);
		} else {
			throw new InstanceDoesNotExist('user', 'name', userName);
		}
	}

    getUsers(){
        return this.users;
    }
 
	getTrack(trackToSearch){ // se puede reemplazar por getInstanceByAttribute
		let trackName = trackToSearch.name ;
		if(this.tracks.some(track => track.name == trackName)){
			 return this.tracks.find(t => t.name == trackName);
		} else {
			 throw new InstanceDoesNotExist('track', 'name', trackName);
		}
	}
 
	listenTrack(userToSearch, track){
		 let user = this.getUser(userToSearch);
		 user.listenTrack(this.getTrack(track));
		 return user;
	}
 
	getListened(user){
		 return this.getUser(user).getListened();
	}
 
	timesListened(userToSearch, trackToSearch){
		 let track = this.getTrack(trackToSearch);
		 return this.getUser(userToSearch).timesListened(track);
	}

	getTop3FromArtist(artist){
		const allTracks = this.getListenedArtistTracks(artist);
		const ret = allTracks.sort(function(a,b){
			return b[1]-a[1];
		}).slice(0,3).map(([track,n]) => track);
		return ret;
	}

	getListenedArtistTracks(artist){//[[Track, Int]]
		//Devuelve la lista de cada track del artista "artist" con su respectiva cantidad de reproducciones
		let tracks = [];
		this.users.forEach( user => {
			this.pushUserTracks(tracks, user.getTracks(artist))
		});
		return tracks;
	}

	pushUserTracks(tracks, tracksToAdd){
		const mappedId = tracks.map(([track,n]) => track.id) ;
		tracksToAdd.forEach( trackToAdd =>{
			
			if(mappedId.includes(trackToAdd[0].id)){
				this.increaseNTimesListened(tracks,trackToAdd);
			} else {
				tracks.push(trackToAdd);
			}
		} );
	}

	increaseNTimesListened(tracks, trackToAdd){
		for (var i in tracks){
			if(tracks[i][0].id === trackToAdd[0].id){
				tracks[i][1] = tracks[i][1]+trackToAdd[1];
				break;
			}
		}
	}

    deleteTrack(track){
        const albumOfTrack = track.album;
        albumOfTrack.deleteTrack(track);

        this.playlists.forEach(playlist => {
			if(playlist.tracks.some(t => t.id===track.id)){
				for(i= 0; i < playlist.tracks.length; i++){
					if(playlist.tracks[i] === track){
						playlist.tracks.splice(i,1);
						break;
					}
				}
				playlist.duration = playlist.duration - track.duration;
			}
		}) 

		for(var i in this.tracks) {
			if(this.tracks[i] === track){
				this.tracks.splice(i,1);
				break;
			}
		}
		this.notify("removedTrack", {changedObject:track});
    }

    deleteAlbum(album){
        const artistOfAlbum = album.artist;
		artistOfAlbum.deleteAlbum(album);
        
        album.tracks.forEach( deltaTrack =>
			 this.deleteTrack(deltaTrack)
		);
        this.albums = this.albums.filter( deltaAlbum => deltaAlbum !== album );
		this.notify("removedAlbum", {changedObject:album});
    }
    
    deleteArtist(artist){
        this.artists = this.artists.filter( deltaArtist => deltaArtist !== artist );
        artist.albums.forEach( deltaAlbum => {
			this.deleteAlbum(deltaAlbum);
		});
		this.notify("removedArtist",{changedObject:artist, artist:artist});
		
    }

    deletePlaylist(playlistName){
		this.playlists = this.playlists.filter(playlist => {playlist.name !== playlistName});
	}

	deletePlaylistById(id){
		this.playlists = this.playlists.filter(playlist => playlist.id !== id);
	}

	deleteUser(user){
		this.users = this.users.filter(deltaUser => user.name !== deltaUser.name);
		this.playlists.forEach(playlist => {
			if(playlist.user.name=== user.name){
				playlist.user = [];				
			}			
		});
	}

	save(filename) {
		let serializedData;
		serializedData = picklify.picklify(this);
		fs.writeFileSync(filename, JSON.stringify(serializedData, null, 2));
	}

	static load(filename) {
        const serializedData = fs.readFileSync(filename, {encoding: 'utf-8'});
        const classes = [UNQfy, 
                        Playlist, 
                        Artist, 
                        Album, 
                        Track, 
                        TrackList,
                        User,
                        ArtistBelongs,
                        AlbumBelongs,
                        PlaylistBelongs,
                        TrackBelongs,
                        UserBelongs,
						LoggingObserver,
						LoggingClient,
						NewsletterObserver,
						NewsletterClient,
						Subject
                    ];
        const ret = picklify.unpicklify(JSON.parse(serializedData), classes);
        return ret;
	}

	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	getAndIncrementId(input){
        const attribute = `${input}IdGenerator`;
        const ret = this[attribute] ;
        this[attribute]++ ;
		
		return ret;
	}
//                         2            Track            
    getInstanceByAttribute(atributeValue, classOfInstance, atributeName='id') {
        let atribute = atributeValue;
        const error = new InstanceDoesNotExist(classOfInstance,atributeName, atribute);
        
        if(atributeName=='id'){atribute = parseInt(atribute);}
        if( this[`${classOfInstance}s`].some(instance => instance[atributeName] === atribute) ){
			return this[`${classOfInstance}s`].find(instance => instance[atributeName] == atribute);
		} else{
			throw error;
		}
    }
    /*    
devuelve
    - instancias del tipo classOfReturnedInstances y 
    - si se va a buscar en una clase conocida entonces
        - el nombre de esa clase sera knownClass, a la cual
        - se le va a pedir el atributo attributeName
        - con el valir attributeValue
    - y si no se va a buscar en una clase conocida entonces
        - se va a fijar en la clase classOfReturnedInstances
        - los atributos que se llamen attributeName y 
        - el valor sea attributeValue
    - por defecto lo que le pasemos lo va a buscar directamente en classOfReturnedInstances*/
    getInstancesMatchingAttributeWithOption(
        classOfReturnedInstances, 
        attributeName, //si busca en una clase que conoce este va a ser el atributo de la clase que conoce
        attributeValue, //lo mismo que el nombre de atributo
        searchInKnownClass=false, 
        knownClass=null 
    ){ 
        let ret = [];
        const unqfyList = this[`${classOfReturnedInstances}s`];
        const unqfyNotIsUndefined = unqfyList !== undefined;

        if( unqfyNotIsUndefined && searchInKnownClass ){
            ret = 
                this.getInstancesMatchingAttribute(
                    unqfyList,
                    classOfReturnedInstances, 
                    knownClass, 
                    attributeName, 
                    attributeValue);
        } 
        else if( unqfyNotIsUndefined && unqfyList.some(instance => instance[attributeName] == attributeValue )){ 
            ret = unqfyList.filter( instance => instance[attributeName] == attributeValue);
        } 
        else{
            this.handleErrors(
                unqfyNotIsUndefined, 
                classOfReturnedInstances, 
                attributeName, 
                attributeValue);
        }

        return ret.length==1 ? ret = ret[0] : ret;
    } 

    getInstancesMatchingAttribute(
        unqfyList, 
        classOfReturnedInstances, 
        knownClass, 
        attributeNameOfKnownClass, 
        attributeValueOfKnownClass){

        if(unqfyList.some(instance => instance[knownClass][attributeNameOfKnownClass] == attributeValueOfKnownClass) ){
            return unqfyList.filter(instance => instance[knownClass][attributeNameOfKnownClass] == attributeValueOfKnownClass);
        } else{
            throw new InstanceRequestedByIndirectAttributeDoesNotExist(
                classOfReturnedInstances, 
                knownClass, 
                attributeNameOfKnownClass, 
                attributeValueOfKnownClass
            );
        }
    }

    handleErrors(unqfyNotIsUndefined, classOfReturnedInstances, attributeName, attributeValue){
        if( !unqfyNotIsUndefined ){
            throw new Error(`the class ${classOfReturnedInstances} doesnt exists, did you write the word well?`);
        } else{
            throw new InstanceDoesNotExist(classOfReturnedInstances, attributeName, attributeValue);
        }
    }

    getTracksMatchingName(trackName) {
        let ret = [];
        this.tracks.map(track => {
            if(track.name == trackName){
                ret.push(track);
            }
        });
        
        if(ret.length == 0){throw new InstanceDoesNotExist('track', 'name',trackName)};
        
        return ret;
    } 
    
    getAlbumsMatchingName(albumName){
        let ret = [];
        this.albums.map(album => {
            if(album.name == albumName){
                ret.push(album);
            }
        });
        
        if(ret.length == 0){throw new InstanceDoesNotExist('album', 'name', albumName)};
        
        return ret;
    }

	
    getPlaylistsMatchingName(playlistName){
        let ret = [];
        this.playlists.map(pl => {
            if(pl.name == playlistName){
                ret.push(pl);
            }
        });
        
        if(ret.length == 0){throw new InstanceDoesNotExist('playlist', 'name', playlistName)};
        
        return ret;
    }

	async getLyrics(trackName){
		try{
			let track = this.getInstanceByAttribute(trackName, "track", "name");
			if(track.getLyrics() == ""){
    			var data = await mmGetLyrics(track);
    			track.setLyrics(data);
    			this.save('data.json');
    			return data;	
			}
			console.log(track.lyrics);
			return track.getLyrics();	
		} catch(error){
			if(error.message.startsWith("header")){
				throw new Error("Lyrics not found");
			} else throw error;
		}	
	}


	async populateAlbumsForArtist(artistName){
		try{
			const artist = this.getInstanceByAttribute(artistName,"artist","name");
			const albums = await getAllArtistAlbums(artistName);
			this.saveArtistAlbums(artist.getId(),albums);
			this.save('data.json');
		} catch(error){
			throw error;
		}
	}

	saveArtistAlbums(artistId, albums){
		for(var i = 0; i < albums.length; i++){
			const albumData = {
				name: albums[i].name,
				year: albums[i].release_date.substring(0,4)
			}
			try{
			this.addAlbum(artistId, albumData);
			} catch {}
		}
	}
	
	getAlbumsForArtist(artistName){
		try{
			const artist = this.getInstanceByAttribute(artistName,"artist","name");
			return artist.getAlbums().map(album => 
				album.name
			);
		}catch(e){
			throw e;
		}
	}

    modifyInstance(id, typeOfInstance, modifiedData){
		if(id != undefined){
        	let instance = this.getInstanceByAttribute(id, typeOfInstance);
        	instance.setAttributes(modifiedData);
			return instance;
		} else {
			throw new Error("InvalidInputKey");
		}
    }

	getMatchingPlaylists(name, greaterThan, lessThan){
		if(name != undefined || greaterThan != undefined || lessThan != undefined){
			let playlists = this.playlists;
			if(name != undefined){
				playlists = playlists.filter(playlist => 
					playlist.name == name
				);
			}
			if(greaterThan != undefined){
				playlists = playlists.filter(playlist => 
					playlist.duration > greaterThan
				);
			}
			if(lessThan != undefined){
				playlists = playlists.filter(playlist => 
					playlist.duration < lessThan
				);
			}
			return playlists;
		} else {
			throw new Error("InvalidInputKey");
		}
	}

	filterByName(name, classname){
		let ret = this[classname].filter(instance =>
			instance.name.toLowerCase().includes(name.toLowerCase()));
		return (ret)
	}

}

module.exports = {
    UNQfy: UNQfy,
};

