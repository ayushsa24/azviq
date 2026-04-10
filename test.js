(async () => {
    try {
        const response = await fetch('https://api.paiza.io/runners/create', {
            method: 'POST',
            body: JSON.stringify({
                source_code: 'print("hello paiza")',
                language: 'python3',
                api_key: 'guest'
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        console.log("Create Data:", data);

        // Need to hit details api then
        setTimeout(async () => {
            const res2 = await fetch(`https://api.paiza.io/runners/get_details?id=${data.id}&api_key=guest`);
            const data2 = await res2.json();
            console.log("Details Data:", data2);
        }, 2000);
    } catch(e) {
        console.error(e);
    }
})();