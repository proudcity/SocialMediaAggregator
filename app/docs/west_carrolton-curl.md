curl -u proudCity -X GET -H "Content-Type: application/json" 'http://feeds.proudcity.com:8084/user/Huntsville,_Alabama/aggregate'

curl -u proudCity -X POST -H "Content-Type: application/json" -d '{
    "type": "city",
    "name": "Huntsville,_Alabama",
    "label": "Huntsville, Alabama",
    "geojsonUrl": "",
    "agencies": [
        {
            "name": "local",
            "youtube": {
                "frequency": 900,
                "feeds": [
                    {
                        "type": "account",
                        "query": "nycgov"
                    }
                ]
            },
            "twitter": {
                "frequency": 900,
                "feeds": [
                    {
                        "type": "account",
                        "query": "nycgov"
                    }
                ]
            },
            "instagram": {
                "frequency": 900,
                "feeds": [
                    {
                        "type": "account",
                        "query": "nycgov"
                    }
                ]
            },
            "facebook": {
                "frequency": 900,
                "feeds": [
                    {
                        "type": "account",
                        "query": "nycgov"
                    }
                ]
            }
        }
    ]
}' 'http://feeds.proudcity.com:8084/user/create'

curl -u proudCity -X POST -H "Content-Type: application/json" -d '{
    "name": "West_Carrollton,_Ohio"
}' 'http://feeds.proudcity.com:8084/user/delete'

curl -u proudCity -X POST -H "Content-Type: application/json" -d '{
    "name": "newyork_ny"
}' 'http://feeds.proudcity.com:8084/user/delete'