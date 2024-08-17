/* deno v1.28.1 */

// Importer quelques librairies
import * as path from "https://deno.land/std/path/mod.ts";
import fs from "https://deno.land/std@0.174.0/node/fs.ts";

// Définir certaines variables, modifier avant chaque téléchargement
var transferKey = ""
var password = "" // laisser vide si aucun mdp

async function main(){
	// Obtenir des informations sur le transfert
	var info = await fetch(`https://api.scw.iliad.fr/freetransfert/v2/transfers/${transferKey}`, { headers: { 'x-password': password } })
	.then(res => res.json())
	console.log(info)
	if(info?.message == 'Forbidden') return console.log("Vous devez entrer un mot de passe, ou celui entré est incorrect")
	if(info?.error || info?.message) return console.log(`Erreur (1er fetch) : ${JSON.stringify(info?.message) || info?.message || info?.error || info}`)

	// Obtenir le lien de téléchargement
	var url = await fetch(`https://api.scw.iliad.fr/freetransfert/v2/files?transferKey=${transferKey}&path=${info?.zip?.path ? info?.zip?.path : info?.files?.[0]?.path}`, { headers: { 'x-password': password } })
	.then(res => res.json())
	if(url?.error || url?.message) return console.log(`Erreur (2ème fetch) : ${JSON.stringify(url?.message) || url?.message || url?.error || url}`)
	console.log(`Le${info?.zip?.path ? 's' : ''} fichier${info?.zip?.path ? 's' : ''} peut être téléchargé via : ` + url?.url)
}; main()