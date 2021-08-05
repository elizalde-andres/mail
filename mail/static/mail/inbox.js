document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', () => compose_email());

  // By default, load the inbox
  load_mailbox('inbox');
    
});

function compose_email(recipientPrefill = '', subjectPrefill = '', bodyPrefill = '') {

  const recipients = document.querySelector('#compose-recipients')
  const subject = document.querySelector('#compose-subject')
  const body = document.querySelector('#compose-body')

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  recipients.value = recipientPrefill;
  subject.value = subjectPrefill;
  body.value = bodyPrefill;


  //Send email
  document.querySelector('#compose-form').onsubmit = () => {
    fetch('/emails', {
      method: 'POST',
      body: JSON.stringify({
          recipients: recipients.value,
          subject: subject.value,
          body: body.value
      })
    })
    
    .then( async response => {
      const result = await response.json();

      if (response.ok) {
        load_mailbox('sent')
      } else {
        //TODO:Show error if mail was not sent
        alert(`${result.error}`),
        console.log("Error "+ response.status + ": " + result.error)
      }
    })

    return false;
  }

}

function load_mailbox(mailbox) {
  const emailsView = document.querySelector('#emails-view');

  // Show the mailbox and hide other views
  emailsView.style.display = 'block';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';

  // Show the mailbox name
  emailsView.innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  //Get emails from the mailbox
  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {
    // Show emails
    emails.forEach(email => {
      let readEmail = "unread";
      if (email.read) readEmail = "read"
      
      //Create div with mail info
      const emailDiv = document.createElement('div');
      emailDiv.className = `mailInfo ${readEmail}`
      emailDiv.innerHTML = `<a href="#">[${email.sender}] ${email.subject} ${email.timestamp}</a>`;
      emailDiv.addEventListener('click', function() {
          view_email(email.id, mailbox);
      });
      emailsView.append(emailDiv);
    });
  });
}

//Shows the content of email.
//First parameter: id of the email.
//Second parameter: 'archive' if the mail is shown from inbox mailbox or
//                  'unarchive' if the mail is shown from archive mailbox
function view_email(id, mailbox) {
  const emailView = document.querySelector('#email-view');

  // Show email view and hide other views
  emailView.style.display = 'block';
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';

  //Clear emailview
  emailView.innerHTML = ''

  //Get email
  fetch(`/emails/${id}`)
  .then(response => response.json())
  .then(email => {
      //Create div with mail
      const emailDiv = document.createElement('div');
      emailDiv.className = `fullEmail`
      emailDiv.innerHTML = `<p>From: [${email.sender}] to ${email.recipients} at ${email.timestamp}</p>
                            <p><strong>${email.subject}</strong></p>
                            <p>${email.body}</p>`;
      emailView.append(emailDiv);
      
      //Add archive/unarchive and reply buttons to emails in inbox or archived mailboxes
      if (mailbox != 'sent') { 
        // Create archive/unarchive button
        const archiveButton = document.createElement('button');
        buttonAction = 'archive';
        if (mailbox == 'archive') buttonAction = 'unarchive'
        archiveButton.className = buttonAction;
        archiveButton.type = "button";
        archiveButton.innerHTML = buttonAction.charAt(0).toUpperCase() + buttonAction.slice(1);

        // Archive/Unarchive email
        archiveButton.addEventListener('click', async function() {
          let archive = false;
          if (mailbox == 'inbox') archive = true;
          await fetch(`/emails/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                archived: archive
            })
          });
          
          //After archive/unarchive load user's inbox
          load_mailbox('inbox');
        });      
      
        emailView.append(archiveButton);

        // Create reply button
        const replyButton = document.createElement('button');
        replyButton.className = 'reply';
        replyButton.type = "button";
        replyButton.innerHTML = 'Reply';
        replyButton.addEventListener('click', function () {
          const recipientPrefill = email.sender;
          const subjectPrefill = email.subject.slice(0,4) == 'Re: ' ? email.subject : `Re: ${email.subject}`;
          const bodyPrefill = `\n\nOn ${email.timestamp} ${email.sender} wrote:\n${email.body}`;
          compose_email(recipientPrefill, subjectPrefill, bodyPrefill);
        });

        emailView.append(replyButton);
      }

      // Mark as read
      fetch(`/emails/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
            read: true
        })
      })
  });

}