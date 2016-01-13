curl -u proudCity -X GET -H "Content-Type: application/json" 'http://dev.getproudcity.com:8080/user/West_Carrollton,_Ohio/aggregate'

curl -u proudCity -X POST -H "Content-Type: application/json" -d '{
    "type": "city",
    "name": "West_Carrollton,_Ohio",
    "label": "West Carrollton",
    "geojsonUrl": "",
    "agencies": [
        {
            "name": "local",
            "youtube": {},
            "twitter": {
                "frequency": 3000,
                "feeds": [
                    {
                        "type": "account",
                        "query": "westcarrollton"
                    }
                ]
            },
            "instagram": {},
            "facebook": {
                "frequency": 3000,
                "feeds": [
                    {
                        "type": "account",
                        "query": "westcarrollton"
                    }
                ]
            }
        },
        {
            "name": "policedept",
            "youtube": {},
            "twitter": {},
            "instagram": {},
            "facebook": {
                "frequency": 3000,
                "feeds": [
                    {
                        "type": "account",
                        "query": "197141623670103"
                    }
                ]
            }
        },
        {
            "name": "firedept",
            "youtube": {},
            "twitter": {},
            "instagram": {},
            "facebook": {
                "frequency": 3000,
                "feeds": [
                    {
                        "type": "account",
                        "query": "269399526526644"
                    }
                ]
            }
        },
        {
            "name": "farmersmarket",
            "youtube": {},
            "twitter": {},
            "instagram": {},
            "facebook": {
                "frequency": 3000,
                "feeds": [
                    {
                        "type": "account",
                        "query": "492270000826837"
                    }
                ]
            }
        }
    ]
}' 'http://dev.getproudcity.com:8080/user/create'

curl -u proudCity -X POST -H "Content-Type: application/json" -d '{
    "type": "city",
    "name": "West_Carrollton,_Ohio",
    "label": "West Carrollton",
    "geojsonUrl": "",
    "agencies": [
        {
            "name": "policedept",
            "youtube": {},
            "twitter": {},
            "instagram": {},
            "facebook": {
                "frequency": 1,
                "feeds": [
                    {
                        "type": "account",
                        "query": "197141623670103"
                    }
                ]
            }
        },
        {
            "name": "firedept",
            "youtube": {},
            "twitter": {},
            "instagram": {},
            "facebook": {
                "frequency": 1,
                "feeds": [
                    {
                        "type": "account",
                        "query": "269399526526644"
                    }
                ]
            }
        },
        {
            "name": "farmersmarket",
            "youtube": {},
            "twitter": {},
            "instagram": {},
            "facebook": {
                "frequency": 1,
                "feeds": [
                    {
                        "type": "account",
                        "query": "492270000826837"
                    }
                ]
            }
        }
    ]
}' 'http://dev.getproudcity.com:8080/user/update'

curl -u proudCity -X POST -H "Content-Type: application/json" -d '{
    "name": "West_Carrollton,_Ohio"
}' 'http://dev.getproudcity.com:8080/user/delete'