/*
J'ai pas vraiment testé ce script, simplement la requête fetch depuis les DevTools de mon navigateur.
Vous pouvez proposer des changements s'il ne fonctionne pas comme prévu ;)
*/

// Définir certaines variables, modifier avant chaque suppression
var transferKey = ""
var deleteKey = ""
var password = "" // laisser vide si aucun mot de passe

async function main(){
	var result = await fetch(`https://api.scw.iliad.fr/freetransfert/v2/transfers/${transferKey}`, { method: 'DELETE', headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: password.length ? password : null, deleteKey: deleteKey }) })
	try {
		console.log(await result.JSON())
	} catch(err){
		console.log("Le fichier devrait être supprimé.")
	}
}; main()