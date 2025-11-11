import requests, time

SERVER = "https://puspeshd.pythonanywhere.com"

prompt = input("Enter prompt: ")
requests.post(f"{SERVER}/send_prompt", json={"prompt": prompt})
print("Prompt sent ✅")

while True:
    res = requests.get(f"{SERVER}/get_result").json()
    if res["result"] != "pending":
        print("Model response:")
        print(res["result"])
        break
    time.sleep(3)
