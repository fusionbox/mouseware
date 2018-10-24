(function(exports, $) {
  var TOTAL_EVENTS = 500
    , events_left = TOTAL_EVENTS;

  if ( random.ready() )
    events_left = 0;

  function parseOptions(options) {
    return $.extend({
        use_dirty: false
      , use_number: false
      , use_symbol: false
      , use_spaces: true
      }, options);
    };

  exports.sentencePassword = function(template, options) {
    var entropy = 0
      , sentence = []
      , haystack
      , token
      , i;

    options = parseOptions(options);

    for ( i = 0; i < template.length; i++ ) {
      token = template[i];
      haystack = words[token];

      if ( ! haystack )
        throw new Error('Unknown token "' + token + '"');

      if ( options.use_dirty )
        haystack = haystack.concat(words["dirty_" + token]);

      sentence.push(random.choice(haystack));
      entropy += Math.log(haystack.length)/Math.log(2);
    }

    if ( options.use_dirty )
    {
      // choose a random word to replace with a dirty word
      // note: not all parts of speech have dirty equivalents
      do
      {
        i = random.random(template.length);
        token = template[i];
        haystack = words["dirty_" + token];
      } while ( ! haystack
                || haystack.length == 0 )

      sentence[i] = random.choice(haystack);

      entropy += Math.log(template.length)/Math.log(2);
      entropy -= Math.log(words[token].length)/Math.log(2);
    }

    if (!options.use_spaces) // Capitalize the letters if we don't use spaces
    {
      for ( i = 0; i < sentence.length; i++ ) {
        token = sentence[i];
        token = token.substr(0, 1).toUpperCase() + token.substr(1);
        sentence[i] = token;
      }
    }

    var ret = {
      password: sentence.join(" ")
    , entropy: entropy
    };
    if ( options.use_number )
    {
      var new_password = exports.addReplacement({
        'a': '4',
        'e': '3',
        'i': '1',
        'o': '0',
        'q': '9',
        's': '5',
        't': '7',
        'z': '2'
        }, ret.password);
      ret.password = new_password.password;
      ret.entropy += new_password.entropy;
    }
    if ( options.use_symbol )
    {
      var new_password = exports.addReplacement({
        'a': '@',
        'b': '|3',
        'c': '(',
        'h': '|-|',
        'i': '!',
        'k': '|<',
        'l': '|',
        't': '+',
        'v': '\\/',
        's': '$',
        'x': '%'
        }, ret.password);
      ret.password = new_password.password;
      ret.entropy += new_password.entropy;
    }
    if ( ! options.use_spaces )
    {
      ret.password = ret.password.replace(/ /g, '');
    }
    return ret;
  };

  exports.addReplacement = function(replacements, string) {
    var chars = string.split('')
      , i
      , replaceable = new RegExp('[' + Object.keys(replacements) + ']', 'g');

    do {
      i = random.random(chars.length);
    } while ( ! chars[i].match(replaceable) )

    chars[i] = replacements[chars[i]];
    return {
      password: chars.join('')
    , entropy: Math.log(string.match(replaceable).length)/Math.log(2)
    };
  };

  exports.templateEntropy = function(template, options) {
    var entropy = 0
      , haystack;

    options = parseOptions(options);

    for ( var i = 0; i < template.length; i++ ) {
      haystack = words[template[i]];
      if ( options.use_dirty )
        haystack = haystack.concat(words["dirty_" + template[i]]);
      entropy += Math.log(haystack.length)/Math.log(2);
    }

    return entropy;
  };

  $(document).ready(function() {
    var more_entropy_progress_div = $('#more_entropy .progress div')
      , reminder_elem = $('#more_entropy .reminder')
      , show_reminder = function() { reminder_elem.addClass('visible'); }
      , reminder_timeout = null
      , generate_password = function() {
          var template = ['adjective', 'noun', 'verb', 'adjective', 'noun']
            , options_form = $('#options')[0];

          if (options_form.markov.checked) {
            var passwordInfo = genMarkovPassphrase(markovChain)
              , password = passwordInfo.password
              , entropy = passwordInfo.entropy.toFixed(1)
              , entropyHtml = entropy + ' bits of estimated entropy.';
          } else {
            if ( options_form.use_more_words.checked )
              template = ['article', 'adjective', 'noun', 'verb', 'article', 'adjective', 'noun'];

            if ( options_form.diceware.checked ) {
              template = ['diceware', 'diceware', 'diceware', 'diceware', 'diceware'];
              if ( options_form.use_more_words.checked )
                template = template.concat(['diceware', 'diceware']);
            }

            var sentence = exports.sentencePassword(template, {
              use_dirty: options_form.use_dirty.checked
            , use_number: options_form.use_number.checked
            , use_symbol: options_form.use_symbol.checked
            , use_spaces: options_form.use_spaces.checked
            });

            var entropy = sentence.entropy.toFixed(1)
              , possibles = Math.pow(2, sentence.entropy - 1) // on average, only half the possibilities will be needed.  so -1 exponent
              , small_guesses_per_year = 1000 * 3600*24*365
              , large_guesses_per_hour = 1e11 * 3600;

            var entropyHtml = entropy + " bits of entropy.<br />" +
            (possibles / small_guesses_per_year).toFixed(1) + " years to guess at 1000 guesses/second.<a href='#online'>[1]</a><br />" +
            (possibles / large_guesses_per_hour).toFixed(1) + " hours to guess at 100 billion guesses/second.<a href='#offline'>[2]</a>"

            var password = sentence.password;
          }

          $('#generate .password').text(password);
          $('#generate .entropy').html(entropyHtml);
        };

    $('#generate_button').click(generate_password);

    if ( events_left == 0 ) {
      $('#more_entropy').hide();
      $('#generate').show();
      generate_password();
    }

    $('#toggle_options_button').click(function() {
      $('.toggleOptions').hide();
      $('#options').fadeIn();
    });

    $('.enable_diceware').click(function() {
      $('#toggle_options_button').click();
      $('#options [name=diceware]').prop('checked', true);
      generate_password();
    });

    $('[name=markov]').on('change', function() {
      var disabled = $('[name=markov]').prop('checked');
      $('#options input[type=checkbox]:not([name=markov])').prop('disabled', disabled);
    });

    var add_entropy = function(x, y, ms) {
      reminder_elem.removeClass('visible');
      if ( reminder_timeout )
        clearTimeout(reminder_timeout);
      reminder_timeout = setTimeout(show_reminder, 5000);

      random.addEntropy(x + y + ms);
      events_left--;
      if (  events_left == 0 ) {
        $('#more_entropy').hide();
        $('#generate').show();
        generate_password();
      }
      else if ( events_left > 0 && events_left % 10 == 0 )
      {
        more_entropy_progress_div.css('width', ((TOTAL_EVENTS - events_left)/TOTAL_EVENTS * 100) + '%');
      }
    };

    $(document).on('mousemove', function(event) {
      add_entropy(event.clientX, event.clientY, event.timeStamp);
    }).on('touchmove', function(event) {
      if ( !random.ready() && navigator.userAgent.match(/android/i) ) {
        // android only fires a single touchmove unless preventDefault.
        // this makes the initial entropy collection faster without messing up
        // drags later.
        event.preventDefault();
      }
      event = event.originalEvent;
      add_entropy(event.touches[0].clientX, event.touches[0].clientY, event.timeStamp);
    });
  });
})(window, jQuery);
