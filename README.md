
## Example
https://king-api-endpoint.herokuapp.com/api-endpoint

```
var jsonContent = { 
    title: "title",
    imageUrl: "https://image.flaticon.com/icons/png/512/61/61456.png",
    contact: [ {id: 12345, name: "King Lai"},{id: 12346, name: "King Lai"}],
    show: true 
};
```


## Example With Parameter
https://king-api-endpoint.herokuapp.com/api-endpoint-parameter?title=King

```
var titleRequest = request.query.title; // Change .title / .name or any text based on your parameter name

var jsonContent = { 
      title: titleRequest,
      imageUrl: "https://image.flaticon.com/icons/png/512/61/61456.png",
      contact: [ {id: 12345, name: "King Lai"},{id: 12346, name: "King Lai"}],
      show: true 
  };
```
