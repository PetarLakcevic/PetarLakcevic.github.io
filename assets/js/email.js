jQuery('#contact-form').on('submit', function (e) {
    jQuery('#msg').html('');
    jQuery('#submit').html('Please wait');
    jQuery('#submit').attr('disabled', true);

    event.preventDefault(); // prevent reload

    var formData = new FormData(this);
    formData.append('service_id', 'service_exfbys9');
    formData.append('template_id', 'websitetemplate');
    formData.append('user_id', 'vlBg5p9s6McaX6Ln8');

    $.ajax('https://api.emailjs.com/api/v1.0/email/send-form', {
        type: 'POST',
        data: formData,
        contentType: false, // auto-detection
        processData: false // no need to parse formData to string
    }).done(function () {
        jQuery('#msg').html('Email sent successfully!');
        jQuery('#submit').html('Submit');
        jQuery('#submit').attr('disabled', false);
        jQuery('#contact-form')[0].reset();
    }).fail(function (error) {
        alert('Oops... Something went wrong, please try again later!');
    });

});