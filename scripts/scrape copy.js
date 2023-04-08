import axios from "axios";
import * as cheerio from "cheerio";
import { encode } from "gpt-3-encoder";
import fs from "fs";

const BASE_URL = "https://jetpack.com";
const CHUNK_SIZE = 200;
const startPath = "/sitemap-1.xml";
const supportPath = `https://jetpack.com/support/`;
const blogPath = `https://jetpack.com/blog/`;
const includeBlog = !true;

const getLinks = async () => {
	const html = await axios.get(`${BASE_URL}${startPath}`);
	const $ = cheerio.load(html.data);
	const table = $("urlset");
	const locs = $(table).find("loc");
	const links = [...locs].map((el) => $(el).text());
	return links.filter((el) => {
		return (
			(el.startsWith(supportPath) && el.length > supportPath.length) ||
			(includeBlog && el.startsWith(blogPath) && el.length > blogPath.length)
		);
	});
};

const getContent = async (url) => {
	const html = await axios.get(url);
	const $ = cheerio.load(html.data);
	const content = $(".jetpack_support");

	// remove get help & related posts
	content.find("#get-help").parent().remove();
	content.find("#jp-relatedposts").parent().remove();
	const text = content.text();
	let cleanedText = text.replace(/\s+/g, " ");
	cleanedText = cleanedText.replace(/\.([a-zA-Z])/g, ". $1");
	cleanedText = cleanedText.trim();
	//console.log(cleanedText);
	return {
		title: $("h1").text(),
		url,
		content: cleanedText,
		length: cleanedText.length,
		tokens: encode(cleanedText).length,
		chunks: [],
	};
};

const chunkContent = async (contentObj) => {
	const { title, url, content, tokens } = contentObj;
	const contentChunks = [];
	if (tokens > CHUNK_SIZE) {
		const sentences = content.split(". ");
		let chunkText = "";
		for (const sentence of sentences) {
			const sentenceTokens = encode(sentence).length;
			const chunkTextTokens = encode(chunkText).length;
			if (chunkTextTokens + sentenceTokens > CHUNK_SIZE) {
				//console.log(chunkText + "#######");
				contentChunks.push(chunkText);
				chunkText = "";
			}
			if (sentence[sentence.length - 1]?.match(/[a-z0-9]/i)) {
				chunkText += sentence + ". ";
			} else {
				chunkText += sentence + " ";
			}
		}
		//console.log(chunkText + "#######");
		contentChunks.push(chunkText.trim());
	} else {
		//console.log(content + "#######");
		contentChunks.push(content);
	}

	const chunks = contentChunks.map((chunk) => {
		return {
			title,
			url,
			content: chunk,
			length: chunk.length,
			tokens: encode(chunk).length,
		};
	});
	if (chunks.length > 1) {
		for (const [index, chunk] of chunks.entries()) {
			const previousChunk = chunks[index - 1];
			if (chunk.tokens < 100 && previousChunk) {
				previousChunk.content += " " + chunk.content;
				previousChunk.tokens += chunk.tokens;
				previousChunk.length += chunk.length;
				chunks.splice(index, 1);
			}
		}
	}
	console.log(chunks);
	return {
		...contentObj,
		chunks,
	};
};

(async () => {
	const links = await getLinks();
	//console.log(links);
	const contentArray = [];

	for (const link of links) {
		const content = await getContent(link);
		const chunkedContent = await chunkContent(content);
		contentArray.push(chunkedContent);
	}
	const json = {
		totalTokens: contentArray.reduce((acc, curr) => acc + curr.tokens, 0),
		content: contentArray,
	};

	fs.writeFile("content.json", JSON.stringify(json), function (err) {
		if (err) {
			return console.log(err);
		}
		console.log("The file was saved!");
	});
	tt;
})();
