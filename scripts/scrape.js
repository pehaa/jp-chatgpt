import axios from "axios";
import * as cheerio from "cheerio";
import { encode } from "gpt-3-encoder";
import fs from "fs";

const BASE_URL = "https://jetpack.com";
const CHUNK_SIZE = 300;
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

const getContent = async (section) => {
	let cleanedText = section.content.replace(/\s+/g, " ");
	cleanedText = cleanedText.trim();
	console.log(cleanedText);
	return {
		...section,
		content: cleanedText,
		length: cleanedText.length,
		tokens: encode(cleanedText).length,
		chunks: [],
	};
};

const getSections = async (url) => {
	const html = await axios.get(url);
	const $ = cheerio.load(html.data);
	const title = $("h1").text();
	const content = $(".jetpack_support");

	// remove get help & related posts
	content.find("#get-help").parent().remove();
	content.find("#jp-relatedposts").parent().remove();

	const sections = content
		.find("h1, h2, h3, summary")
		.map((i, heading) => {
			const content = $(heading)
				.nextUntil("h1, h2, h3, summary, details")
				.map((idx, p) => $(p).text())
				.get()
				.join();
			let sectionTitle = $(heading).text().trim();
			sectionTitle = sectionTitle[sectionTitle.length - 1]?.match(/[a-z0-9]/i)
				? sectionTitle + "."
				: sectionTitle;
			return {
				url,
				title,
				sectionTitle,
				content: `${sectionTitle}  ${content}`,
			};
		})
		.get();

	return sections.filter((el) => el.content.trim());
};

const chunkContent = async (sectionObj) => {
	const { title, sectionTitle, url, content, tokens } = sectionObj;
	console.log(tokens, url);
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
			sectionTitle,
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
	//console.log(chunks);
	return {
		...sectionObj,
		chunks,
	};
};

(async () => {
	// list of pages to scrape - I am using the sitemap.xml and scrapping only /support/{...} pages
	const links = await getLinks();
	console.log(links);
	const contentArray = [];

	getSections(
		"https://jetpack.com/support/jetpack-social/social-sharing-new-posts/"
	);

	for (const link of links) {
		const sections = await getSections(link);
		for (const section of sections) {
			const content = await getContent(section);

			const chunkedContent = await chunkContent(content);
			contentArray.push(chunkedContent);
		}
	}
	const json = {
		totalTokens: contentArray.reduce((acc, curr) => acc + curr.tokens, 0),
		content: contentArray,
	};

	fs.writeFile("content-sections-1.json", JSON.stringify(json), function (err) {
		if (err) {
			return console.log(err);
		}
		console.log("The file was saved!");
	});
})();
