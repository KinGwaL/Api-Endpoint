# Heroku Example - Api Endpoint (Node.js version)
This simple project is for developer who want to create an mock api quickly for testing usage. 

## Setup Step
1. Go to Heroku and sign up(https://signup.heroku.com/) an account
2. In this page, click `Fork` on the top right corner to clone a copy 
3. Click `deploy button` to create application [![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy?template=https://github.com/KinGwaL/Api-Endpoint)
4. Connect data to Heroku
- Open Deploy tab and scroll to the `Deployment method` section
- Select GitHub as the method
- It will show a `Connect to GitHub` option where we can provide our GitHub repository `Api-Endpoint`. If you are doing it for the first time, Heroku will ask permission to access your GitHub account.
- Enable `Auto Deploy` button if you want Heroku detect your github data and upload to Heroku automatically
5. All done! Click `View` to see how's going on. Now you can edit `Server.js` for further usage based on your requirement


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
