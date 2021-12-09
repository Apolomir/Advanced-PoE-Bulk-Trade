let exchangeDataMap
let exaltedValue

//To read from and show the data from exchange-data.json
window.api.send('load-exchange-data')
window.api.receive('receive-exchange-data', (result) => {
    const exchangeDataJson = JSON.parse(result)
    exchangeDataMap = new Map(exchangeDataJson)
    for (const key of exchangeDataMap.keys()) {
        const entry = exchangeDataMap.get(key)
        const content = `
        <tr>
            <td id="name">${entry["name"]}</td>
            <td id="single-price">${entry["singlePrice"]} ${entry["id"]}</td>
            <td id="bulk-price">${entry["bulkPrice"]} ${entry["bulkId"]}</td>
            <td id="profit">${entry["profit"]} chaos</td>
            <td id="offer">${entry["quantityOfTrades"]}</td>
            <td>
                <button class="btn btn-danger btn-sm rounded-0" onclick="refreshData(this, '${key}')" type="button" style="width: 34px">
                    <i id="refresh-icon" class="bi bi-arrow-clockwise"></i>
                    <span id="loading-icon" id="refresh-icon-loading" class="spinner-border spinner-border-sm visually-hidden" role="status" aria-hidden="true"></span>
                </button>
            </td>
            <td><a id="tradeLink" class="btn btn-secondary btn-sm rounded-0" href="#">Trade</a></td>
        </tr>
        `
        $('#table-1').append(content)
    }
})

//To refresh the row in table
const refreshData = async (button, dataId) => {
    $(button).prop('disabled', true)
    $(button).find('#refresh-icon')[0].classList.add("visually-hidden")
    $(button).find('#loading-icon')[0].classList.remove("visually-hidden")

    const entry = exchangeDataMap.get(dataId)
    const result = await fetchPoeData(entry)
    if (!result.error) {
        const tableRow = $(button).closest('tr')

        const maxSinglePrice = result.single.exchange.result.reduce((prev, curr) => (prev.listing.price.amount > curr.listing.price.amount) ? prev : curr).listing.price.amount.toFixed(2)
        const bulkPrice = result.bulk.exchange.result.reduce((prev, curr) => (prev.listing.price.amount < curr.listing.price.amount) ? prev : curr).listing.price.amount.toFixed(2)
        let profit
        if (entry.bulkId === 'exalted' && entry.id === 'exalted') {
            profit = (bulkPrice * exaltedValue - maxSinglePrice * exaltedValue).toFixed(2)
        } else if (entry.bulkId === 'exalted' && entry.id === 'chaos') {
            profit = (bulkPrice * exaltedValue - maxSinglePrice).toFixed(2)
        } else if (entry.bulkId === 'chaos' && entry.id === 'chaos') {
            profit = (bulkPrice - maxSinglePrice).toFixed(2)
        }
        entry.singlePrice = maxSinglePrice
        entry.bulkPrice = bulkPrice
        entry.quantityOfTrades = result.bulk.offers
        entry.profit = profit
        exchangeDataMap.set(dataId, entry)

        tableRow.find('#single-price').text(maxSinglePrice + " " + entry.id)
        tableRow.find('#bulk-price').text(bulkPrice + " " + entry.bulkId)
        tableRow.find('#profit').text(profit + " chaos")
        tableRow.find('#offer').text(result.bulk.offers)
        tableRow.find('#tradeLink').prop('href', result.single.tradeLink)

        console.log(result)

        $(button).prop('disabled', false)
        $(button).find('#refresh-icon')[0].classList.remove("visually-hidden")
        $(button).find('#loading-icon')[0].classList.add("visually-hidden")
    } else {
        $('#modal-1-text').text('Too many requests. Retry after: ' + result.error + ' seconds')
        let myModal = new bootstrap.Modal($('#modal-1')[0])
        myModal.show()

        $(button).prop('disabled', false)
        $(button).find('#refresh-icon')[0].classList.remove("visually-hidden")
        $(button).find('#loading-icon')[0].classList.add("visually-hidden")
    }
}

const fetchPoeData = async (entry) => {
    let result = {}
    const singleItemRequest = {
        exchange: {
            status: {
                option: "online"
            },
            have: [
                entry["id"]
            ],
            want: [
                entry["offerId"]
            ]
        }
    }
    const bulkItemRequest = {
        exchange: {
            minimum: entry["bulkQuantity"],
            status: {
                option: "online"
            },
            have: [
                entry["bulkId"]
            ],
            want: [
                entry["offerId"]
            ]
        }
    }
    await sendTradeRequest(singleItemRequest).then(
        response => {
            result.single = response
        },
        error => {
            result.error = error
        }
    )
    await sendTradeRequest(bulkItemRequest).then(
        response => {
            result.bulk = response
        },
        error => {
            result.error = error
        }
    )
    return result
}

const sendTradeRequest = (requestBody) => {
    return new Promise((resolve, reject) => {
        let result = {}
        $.ajax({
            url: "https://www.pathofexile.com/api/trade/exchange/Scourge",
            method: "post",
            contentType: "application/json",
            data: JSON.stringify(requestBody),
            success: function (response) {
                console.log(response)
                result.offers = response.total
                result.tradeLink = buildTradeUrl(response)
                $.ajax({
                    url: buildFetchUrl(response),
                    method: "get",
                    success: function (response) {
                        console.log(response)
                        result.exchange = response
                        resolve(result)
                    }
                })
            },
            error: function (request, textStatus, errorThrown) {
                reject(request.getResponseHeader('Retry-After'))
            }
        })
    })
}

const buildTradeUrl = (response) => {
    return 'https://www.pathofexile.com/trade/exchange/Scourge/' + response.id
}

const buildFetchUrl = function (response) {
    let data = ""
    for (let i = 0; i < 10 && i < response.total; i++) {
        data += response.result[i] + ","
    }
    data = data.slice(0, -1)
    return "https://www.pathofexile.com/api/trade/fetch/" + data + "?query=" + response.id
}

const init = async () => {
    const request = {
        exchange: {
            status: {
                option: "online"
            },
            have: [
                "chaos"
            ],
            want: [
                "exalted"
            ]
        }
    }
    await sendTradeRequest(request).then(
        result => {
            exaltedValue = result.exchange.result.reduce((prev, curr) => (prev.listing.price.amount > curr.listing.price.amount) ? prev : curr)
            exaltedValue = exaltedValue.listing.price.amount
            console.log(exaltedValue)
        },
        error => {
            console.log(error)
        }
    )
}

$(window).on('beforeunload', () => {
    window.api.send('save-exchange-data', exchangeDataMap)
})

$(document).on('click', 'a[href^="http"]', function(event) {
    event.preventDefault();
    window.shell.openExternal(this.href);
});

init()