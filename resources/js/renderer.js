const exData = JSON.parse(window["exchangeData"]);
exData.result.forEach(exchange => {
    const requestJson = {
        exchange: {
            minimum: "5",
            status: {
                option: "online"
            },
            have: [
                exchange["id"]
            ],
            want: [
                exchange["offerId"]
            ]
        }
    };
    $.ajax({
        url: "https://www.pathofexile.com/api/trade/exchange/Scourge",
        method: "post",
        contentType: "application/json",
        data: JSON.stringify(requestJson),
        success: function (data) {
            console.log(data);
        }
    });
});
