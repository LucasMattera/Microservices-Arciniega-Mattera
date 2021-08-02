# Microservices-Arciniega-Mattera
ENG: Four microservices interconnected: UNQfy, Newsletter, Logging and Monitor
ESP: Cuatro microservicios interconectador: UNQfy, Newsletter, Logging and Monitor

## UNQfy model

#### ESP
En UNQfy existe una gran cantidad de temas musicales (tracks)  los cuales siempre pertenecen a un álbum. Un álbum tiene un sólo artista como autor pero un artista puede ser autor de múltiples albumes. Cada track tiene asociado uno o más géneros, que son strings. También existen playlists, que son conjuntos de tracks que pueden pertenecer a diferentes álbumes.

En UNQfy, además de las típicas operaciones de alta, baja y modificación de todos estos elementos (tracks, albums, artistas), es posible:
realizar búsquedas de temas. 
Debe ser posible recuperar todas las canciones que fueron interpretadas por un determinado artista, y
todas las canciones que se correspondan con un determinado género.
También se desea la opción de autogenerar  una Playlist en base a una lista de géneros, es decir, rellenar una playlist con canciones de determinados géneros y con una duración máxima.

Para operar UNQfy vamos a usar, en principio, la línea de comando. Más abajo se explican los detalles pero a grandes rasgos la idea es tener una serie de comandos que permitan alterar e inspeccionar el modelo de objetos de UNQfy.

Nota 1: Todas las entidades, albumes, tracks y artistas deben tener una propiedad ID, la cual no puede repetirse.

Nota 2: Al eliminar un artista, track o album, se deberá chequear que los tracks involucrados que pertenezcan  a una playlist sean borrados de la playlist también.

#### ENG
In UNQfy there are many songs (tracks) which always belong to an album. An Album have only one Artist but one Artist can be author of multiple Albums. Each Track have one or more genres asociated, as strings. Also there are Playlists, which are sets of Tracks which belong to different Albums.
The UNQfy, besides the typical operations like upload, remove and modification of every elements, it is possible make a search of a song.
It must be pusible recover all the songs that have been interpreted by a specific artist, and all the songs that corresponds to a certain genre.
You also want the option of auto-generating a Playlist based on a list of genres, that is, filling a playlist with songs from certain genres and with a maximum duration.

To operate UNQfy we are going to use, in principle, the command line. The details are explained below but in broad strokes the idea is to have a series of commands that allow to alter and inspect the UNQfy object model.

Note 1: All entities, albums, tracks, and artists must have an ID property, which cannot be repeated.

Note 2: When deleting an artist, track or album, you should check that the tracks involved that belong to a playlist are deleted from the playlist as well.

## UNQfy API Rest
