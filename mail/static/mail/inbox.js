document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', () => compose_email());

  // By default, load the inbox
  load_mailbox('inbox');
    
});

function compose_email(prefill = {recipient : "", subject : "", body: ""}, message = "") {

  const recipients = document.querySelector('#compose-recipients');
  const subject = document.querySelector('#compose-subject');
  const body = document.querySelector('#compose-body');
  const message_view = document.querySelector('#message-view');
  

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';
  message_view.style.display = message == "" ? 'none' : 'block';

  //Show message
  message_view.innerHTML = `<div class='alert alert-danger'>${message}</div>`;

  // Prefill composition fields
  recipients.value = prefill.recipient;
  subject.value = prefill.subject;
  body.value = prefill.body;

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
        compose_email({
          recipient : recipients.value,
          subject : subject.value,
          body : body.value
        }, result.error)
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
  document.querySelector('#message-view').style.display = 'none';

  // Show the mailbox name
  emailsView.innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Show column titles
  const titlesRow = document.createElement('div');
  titlesRow.classList.add("row", "mail-title");
  const from_to = mailbox == "sent" ? "To" : "From";
  titlesRow.innerHTML = `<div class="col-md-3 align-self-start"><h5>${from_to}</h5></div>
                        <div class="col-md-6 align-self-start"><h5>Subject</h5></div> 
                        <div class="col-md-3 align-self-end text-right"><h5>Timestamp</h5></div>`;
  emailsView.append(titlesRow);
  //Get emails from the mailbox
  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {
    // Show emails
    emails.forEach(email => {      
      //Create div with mail info
      const emailRow = document.createElement('div');
      emailRow.classList.add("row", "mail-info", email.read ? "read" : "unread");
      
      const sender_recipients = mailbox == "sent" ? email.recipients : email.sender;

      emailRow.innerHTML = `<div class="col-md-3 align-self-start">[${sender_recipients}]</div>
                            <div class="col-md-6 align-self-start">${email.subject}</div> 
                            <div class="col-md-3 align-self-end text-right">${email.timestamp}</div>`;
      emailRow.addEventListener('click', function() {
          view_email(email.id, mailbox);
      });
      emailsView.append(emailRow);
    });
  });
}

//Shows the content of email.
//First parameter: id of the email.
//Second parameter: origin mailbox (from which the function was called)
function view_email(id, mailbox) {
  const emailView = document.querySelector('#email-view');

  // Show email view and hide other views
  emailView.style.display = 'block';
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#message-view').style.display = 'none';

  //Clear emailview
  emailView.innerHTML = ''

  //Get email
  fetch(`/emails/${id}`)
  .then(response => response.json())
  .then(email => {
      //Create div with mail
      const emailContent = document.createElement('div');
      emailContent.className = "full-email"
      emailContent.innerHTML = `<div><em>From:</em> ${email.sender}</div> 
                                <div><em>To:</em> ${email.recipients}</div>
                                <div class="timestamp">${email.timestamp}</div>
                                <h4 class="subject">${email.subject}</h4>
                                <div class="email-body"><pre>${email.body}</pre></div>`;
      emailView.append(emailContent);
      
      //Add archive/unarchive and reply buttons to emails in inbox or archived mailboxes
      if (mailbox != 'sent') { 
        // Create archive/unarchive button
        const archiveButton = document.createElement('button');
        buttonAction = 'archive';
        if (mailbox == 'archive') buttonAction = 'unarchive'
        archiveButton.className = "btn btn-sm btn-outline-info";
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
        replyButton.className = "btn btn-sm btn-outline-success";
        replyButton.innerHTML = 'Reply';
        replyButton.addEventListener('click', function () {
          const bodyText = email.body.replace(/^([^\n])/gm, '>$1');
          const prefill = {
            recipient: email.sender,
            subject: email.subject.slice(0,4) == 'Re: ' ? email.subject : `Re: ${email.subject}`,
            body: `\n\n>On ${email.timestamp} ${email.sender} wrote:\n${bodyText}`,
          }
          
          compose_email(prefill);
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