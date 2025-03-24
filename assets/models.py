from selectolax import parser
import json

json_path = "models.json"
html_path = "limits.html"

with open(html_path, "rb") as f:
    doc = parser.HTMLParser(f.read())

order = ["id", "rpm", "rpd", "tpm", "tpd", "ash", "asd"]
body = doc.css_first("tbody")

models = []
for row in body.css("tr"):
    model = {}
    for i, cell in enumerate(row.css("td")):
        field = order[i]
        value = cell.text().strip()
        if value == "-":
            value = None
        else:
            try:
                value = int((value or "0").replace(",", ""))
            except ValueError:
                pass
        model[field] = value
    models.append(model)

modelsRefactored = []
for model in models:
    modelsRefactored.append({
        "name": model["id"],
        "rpm": model["rpm"],
        "rpd": model["rpd"],
        "tpm": model["tpm"],
        "tpd": model["tpd"],
        "ash": model["ash"],
        "asd": model["asd"],
    })
with open(json_path, "w") as f:
    json.dump(modelsRefactored, f, indent=2)
