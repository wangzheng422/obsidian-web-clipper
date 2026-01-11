.PHONY: zip clean

zip:
	rm -f vault-web-clipper.zip
	zip -r vault-web-clipper.zip src -x "*.DS_Store"

clean:
	rm -f vault-web-clipper.zip
