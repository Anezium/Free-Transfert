/* deno v1.28.1 */
/* Optimisé pour l'envoi de gros fichiers, gestion des erreurs et suivi de la progression */

// Importer quelques librairies
import * as path from "https://deno.land/std/path/mod.ts";
import fs from "https://deno.land/std@0.174.0/node/fs.ts";

// Définir certaines variables, modifier avant chaque envoi
var filePath = path.join("Test.bin"); // Chemin du fichier à uploader, limité a 500Mo MAX
var password = ""; // Laisser vide si aucun mot de passe
var timeBeforeExpire = 1; // Durée en jours avant que le fichier n'expire

// Taille des chunks (en octets), 10 Mo ici
const CHUNK_SIZE = 10 * 1024 * 1024;

async function main(){
    // Obtenir des informations sur le fichier (nom, taille en octets)
    var fileName = path.basename(filePath);
    var fileSize = (fs.statSync(filePath)).size;

    // Créer un transfert
    var keys = await fetch('https://api.scw.iliad.fr/freetransfert/v2/transfers', {
        method: 'POST',
        body: JSON.stringify({
            availability: timeBeforeExpire,
            password: password.length ? password : null,
            files: [
                {
                    path: fileName,
                    size: fileSize,
                    mimetype: "application/octet-stream"
                }
            ]
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(res => res.json());
    if(keys?.error || keys?.message) return console.log(`Erreur (1er fetch) : ${JSON.stringify(keys?.message) || keys?.message || keys?.error || keys}`);
    console.log(`Transfert créé ! Il pourra être téléchargé depuis https://transfert.free.fr/${keys?.transferKey} | uploadKey : ${keys?.uploadKey} - deleteKey : ${keys?.deleteKey}`);

    var i = 0;
    var partsList = [];
    var totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

    while (i < totalChunks) {
        // Demander à l'API de nous envoyer les URLs pour envoyer les prochains chunks
        var uploadUrls = await fetch(`https://api.scw.iliad.fr/freetransfert/v2/transfers/${keys?.transferKey}/chunk`, {
            method: 'GET',
            headers: {
                'x-upload-key': keys?.uploadKey,
                'x-password': password
            }
        })
        .then(res => res.json());
        if(uploadUrls?.error || uploadUrls?.message) return console.log(`Erreur (fetch des URLs) : ${JSON.stringify(uploadUrls?.message) || uploadUrls?.message || uploadUrls?.error || uploadUrls}`);
        uploadUrls = uploadUrls?.files?.[0]?.parts || uploadUrls?.file?.parts;

        // Lire et envoyer chaque chunk
        var readStream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });

        for (let uploadUrl of uploadUrls) {
            if (!uploadUrl.url) break;

            const chunk = await new Promise((resolve, reject) => {
                readStream.once('data', resolve);
                readStream.once('error', reject);
            });

            console.log(`Envoi du chunk ${i + 1} sur ${totalChunks}... (${Math.round((i + 1) / totalChunks * 100)}%)`);

            try {
                const uploadedEtag = await fetch(uploadUrl.url, {
                    method: 'PUT',
                    body: chunk
                }).then(res => res.headers.get('etag'));

                if (!uploadedEtag) throw new Error(`Échec de l'envoi du chunk ${i + 1}`);

                partsList.push({
                    "PartNumber": i + 1,
                    "ETag": uploadedEtag
                });

                console.log(`Chunk ${i + 1} envoyé avec succès !`);
            } catch (error) {
                console.log(`Erreur lors de l'envoi du chunk ${i + 1} : ${error.message}`);
                // Réessayez ou mettez en place une logique de reprise
                return;
            }

            i++;

            if (i >= totalChunks) {
                readStream.close();
                break;
            }
        }
    }

    // Informer l'API que l'envoi est terminé
    var tellAPI = await fetch(`https://api.scw.iliad.fr/freetransfert/v2/transfers/${keys?.transferKey}/chunk`, {
        method: 'PUT',
        body: JSON.stringify({
            "files": [{
                "path": fileName,
                "parts": partsList
            }]
        }),
        headers: {
            'x-upload-key': keys?.uploadKey,
            'x-password': password,
            'Content-Type': 'application/json'
        }
    })
    .then(res => res.json());
    if(tellAPI?.error || tellAPI?.message) return console.log(`Erreur (fetch tellAPI) : ${JSON.stringify(tellAPI?.message) || tellAPI?.message || tellAPI?.error || tellAPI}`);
    
    console.log(`L'upload est complètement terminé ! Vous pouvez vous rendre sur le lien ou le partager.`);
    console.log(`https://transfert.free.fr/${keys?.transferKey}`);
};

main();
