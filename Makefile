.PHONY: zip clean

zip:
	rm -f obsidian-web-clipper.zip
	zip -r obsidian-web-clipper.zip src -x "*.DS_Store"

clean:
	rm -f obsidian-web-clipper.zip
