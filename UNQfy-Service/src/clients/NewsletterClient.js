const rp = require('request-promise');
require("dotenv").config();

let PORT = process.env.NL_PORT;
let IP = process.env.NL_IP;

const BASE_URL = `http://${IP}:${PORT}/api`;

class NewsletterClient {
    constructor() {
        this.options = this.getOptions();
    }

    getOptions() {
        const options = {
            uri: BASE_URL,
            json: true
        };
        return options;
    }
    async newAlbum(eventData){
        const artist = eventData.artist.name;
        this.options.body = {
            artistId: eventData.artist.id,
            subject: "Nuevo album para el artista " + artist,
            message: "Se ha agregado el album "+eventData.changedObject.name + " al artista " + artist
        }

        this.options.uri = BASE_URL + "/notify";
        await rp.post(this.options);
    }

    async removedArtist(eventData){
        const artistId = eventData.artist.id;
        this.options.body = {
            artistId: artistId
        }
        this.options.uri = BASE_URL + "/subscriptions";
        await rp.delete(this.options);
    }

}

module.exports = NewsletterClient;