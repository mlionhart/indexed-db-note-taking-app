// Create needed constants
const list = document.querySelector('ul');
const titleInput = document.querySelector('#title');
const bodyInput = document.querySelector('#body');
const form = document.querySelector('form');
const submitBtn = document.querySelector('form button');

/* --------------- Database Initial Setup ------------------ */

// Create an instance of a db object for us to store the open database in. This
// will later be used to store an object representing our database.
let db;

// Open our database; it is created if it doesn't already exist - creating request object
// (see the upgradeneeded handler below)
// db operations take time, so since you don't want to hang up the browser while
// you wait, db operations are asynchronous, meaning they happen at some point in
// the future, and you'll get notified when they're done. Then, we'll use event 
// handlers to run code when the request completes, fails, etc.
const openRequest = window.indexedDB.open("notes_db", 1); // version 1 of a db called "notes_db"

// error handler signifies that the database didn't open successfully
openRequest.addEventListener('error', () => {
  console.error("Database failed to open");
});

// success handler signifies that the database opened successfully
openRequest.addEventListener('success', () => {
  console.log("Database opened successfully");

  // store the opened database object in the db variable. This is used a lot below
  db = openRequest.result;

  // run the displayData() function to display the notes already in the IDB
  displayData();
});

// set up the database tables if this has not already been done
openRequest.addEventListener('upgradeneeded', (e) => {
  // grab a reference to the opened database. result property of event's target is 
  // the request object. This is equivalent to the line db = openRequest.result 
  // inside the success event handler, but we need to do this separately here because
  // the upgradeneeded event handler (if needed) will run before the success event
  // handler, meaning the db value wouldn't be available if we didn't do this.
  db = e.target.result;

  // create an objectStore in our database to store notes and an auto-incrementing key
  // an objectStore is similar to a 'table' in a relational database. This is equivalent
  // to a single table in a conventional database system. We've given it the name notes
  // and set up and auto-incrementing id field.
  const objectStore = db.createObjectStore('notes_os', {
    keyPath: "id",
    autoIncrement: true,
  });

  // define what data items the objectStore will contain. We've created two other 
  // indexes (fields) using the IDBObjectStore.createIndex() method: title (which
  // contains the title for each note), and body (which contains the body of each note).
  objectStore.createIndex("title", "title", { unique: false });
  objectStore.createIndex("body", "body", { unique: false });

  console.log("Database setup complete");
});

// create a submit event handler so that when the form is submitted the addData()
// function is run.
form.addEventListener('submit', addData);

// define the addData() function
function addData(e) {
  // prevent default - we don't want the form to submit in the conventional way
  // this would cause a page refresh and spoil the experience
  e.preventDefault();

  // grab the values entered into the form fields and store them in an object
  // ready for being inserted into the DB. We don't have to explicitly include
  // and id value - as mentioned earlier, this is autopopulated
  const newItem = { title: titleInput.ariaValueMax, body: bodyInput.value };

  // open a read/write db transaction against the notes_os object store using the 
  // IDBDatabase.transaction() method. This transactin object allows us to access
  // the object store so we can do something to it, e.g. add a new record.
  const transaction = db.transaction(["notes_os"], "readwrite");

  // call an object store that's already been added to the database. We are accessing
  // the object store using the IDBTransaction.objectStore() method, saving the 
  // result in the objectStore variable.
  const objectStore = transaction.objectStore("notes_os");

  // make a request to add our newItem object to the object store. We are adding
  // the record to the db using IDBObjectStore.add(). This creates a request
  // object, in the same fashion as we've seen before.
  const addRequest = objectStore.add(newItem);

  // add a bunch of event handlers to the request and transaction objects to run 
  // code at critical points in the lifecycle. Once the request has succeeded, we
  // clear the form inputs ready for entering the next note. Once the transaction
  // has completed, we run the displayData() function again to update the display
  // of notes on the page.
  addRequest.addEventListener('success', () => {
    // clear the form, ready for adding the next entry
    titleInput.value = '';
    bodyInput.value = '';
  });

  // report on the success of the transaction completing, when everything is done
  transaction.addEventListener('complete', () => {
    console.log("Transaction completed: database modification finished.");

    // update the display of data to show the newly added item, 
    // by running displayData() again
    displayData();
  });

  transaction.addEventListener('error', () => {
    console.log("Transaction not opened due to error");
  });
} // end of addData() function


// Define the displayData() function ------------------------------------------
function displayData() {
  // Here we empty the contents of the list element each time the display is updated
  // If you didn't do this, you'd get duplicates listed each time a new note is added
  while (list.firstChild) {
    list.removeChild(list.firstChild);
  }

  // Open our object store and then get a cursor - which iterates through all the
  // different data items in the store. We chained success handler on the end for
  // better readability. When cursor is successfully returned, the handler is run
  const objectStore = db.transaction("notes_os").objectStore("notes_os");
  objectStore.openCursor().addEventListener("success", (e) => {
    // Get a reference to the IDBCursor object
    const cursor = e.target.result;

    // If there is still another data item to iterate through (i.e. another record
    // in the datastore), keep running this code
    if (cursor) {
      // Create a list item, h3, and p to put each data item inside when displaying it
      // structure the HTML fragment, and append it inside the list
      const listItem = document.createElement("li");
      const h3 = document.createElement("h3");
      const para = document.createElement("p");

      listItem.appendChild(h3);
      listItem.appendChild(para);
      list.appendChild(listItem);

      // Put the data from the cursor inside the h3 and para
      h3.textContent = cursor.value.title;
      para.textContent = cursor.value.body;

      // Store the ID of the data item inside an attribute on the listItem, so we know
      // which item it corresponds to. This will be useful later when we want to delete items
      listItem.setAttribute("data-note-id", cursor.value.id);

      // Create a button and place it inside each listItem
      const deleteBtn = document.createElement("button");
      listItem.appendChild(deleteBtn);
      deleteBtn.textContent = "Delete";

      // Set an event handler so that when the button is clicked, the deleteItem()
      // function is run
      deleteBtn.addEventListener("click", deleteItem);

      // Iterate to the next item in the cursor (advance the cursor to the next 
      // record in the datastore, and run the content of the if block again).
      // if there is another record to iterate to, this causes it to be inserted
      // into the page, and then continue() is run again, and so on.
      cursor.continue();
    } else {
      // Again, if list item is empty, display a 'No notes stored' message
      // cursor returns undefined when there are no more records to iterate over
      if (!list.firstChild) {
        const listItem = document.createElement("li");
        listItem.textContent = "No notes stored.";
        list.appendChild(listItem);
      }
      // if there are no more cursor items to iterate through, say so
      console.log("Notes all displayed");
    }
  });
} // end of displayData() function --------------------------------------------

// define the deleteItem() function
function deleteItem(e) {
  // retrieve the name of the task we want to delete. We need
  // to convert it to a number before trying to use it with IDB; IDB key
  // values are type-sensitive.
  const noteId = Number(e.target.parentNode.getAttribute("data-note-id"));

  // open a database transaction and delete the task, finding it using the id we retrieved above
  const transaction = db.transaction(["notes_os"], "readwrite");
  const objectStore = transaction.objectStore("notes_os");
  const deleteRequest = objectStore.delete(noteId);

  // report that the data item has been deleted
  transaction.addEventListener("complete", () => {
    // delete the parent of the button
    // which is the list item, so it is no longer displayed
    e.target.parentNode.parentNode.removeChild(e.target.parentNode);
    console.log(`Note ${noteId} deleted.`);

    // Again, if list item is empty, display a 'No notes stored' message
    if (!list.firstChild) {
      const listItem = document.createElement("li");
      listItem.textContent = "No notes stored.";
      list.appendChild(listItem);
    }
  });
}

