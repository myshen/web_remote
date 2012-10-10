$(function() {
  //$(window).resize(function() {
  //  var self = $(this);
  //  $('#pager').height(self.outerHeight());
  //  $('.pagee').width(self.outerWidth() * 2);
  //}).resize();

  var status = $('section#status');

  function flash_status(s) {
    status.html(s).fadeIn(100).delay(100).fadeOut(100);;
  }

  function cmd(cmd) {
    console.log(cmd);
    flash_status(cmd);
    $.getJSON('/cmd/' + cmd).error(function() {
      // the returned page was not JSON. we are probably logged out.
      status.html('logged out');
      setTimeout(function() {
        window.location.reload(true);
      }, 500);
    });
  }
  function play(file) {
    cmd('p ' + file + '.bin');
  }
  function record(file) {
    cmd('r ' + file + '.bin');
  }

  var btv = $('button:contains(TV)');
  var bdvd = $('button:contains(DVD)');

  var btvinputsel = $('select#tvinputsel');
  var btvinputset = $('button#tvinputset');

  var btvinput = $('button:contains(Input)');
  var btvmenu = $('button:contains(TV Menu)');

  var bvolslide = $('input#volslide');
  var bmute = $('button:contains(Mute)');

  var bvolup = $('button#volup');
  var bvoldo = $('button#voldo');
  var bchup = $('button#chup');
  var bchdo = $('button#chdo');

  var bup = $('button#bup');
  var bdown = $('button#bdown');
  var bleft = $('button#bleft');
  var bright = $('button#bright');
  var benter = $('button#benter');

  var brew = $('button#brew');
  var bplay = $('button#bplay');
  var bstop = $('button#bstop');
  var bffw = $('button#bffw');

  var channew = $('#newchan');
  channew.change(function() {
    var num = channew.val();
    var nstr = num + '';
    console.log(num);
    for (var i = 0; i < nstr.length; i++) {
      play(nstr[i]);
    }
    play('enter');
  });

  btv.click(function() {play('powertv');});

  btvinput.click(function() {play('input');});
  btvmenu.click(function() {play('menu');});

  bmute.click(function() {play('muting');});
  bvolup.click(function() {play('volup');});
  bvoldo.click(function() {play('voldo');});
  bchup.click(function() {play('chup');});
  bchdo.click(function() {play('chdo');});

  bup.click(function() {play('up')});
  bdown.click(function() {play('down');});
  bleft.click(function() {play('left');});
  bright.click(function() {play('right');});
  benter.click(function() {play('enter');});

  brew.click(function() {play('rew')});
  bplay.click(function() {play('play');});
  bstop.click(function() {play('stop');});
  bffw.click(function() {play('ffw');});

  var tv_inputs = ['TV', 'Video 1', 'Video 2', 'Component 1', 'Component 2',
                   'HDMI 1', 'HDMI 2', 'PC']

  function distMod(a, b, m) {
    var diff = Math.abs(b - a);
    return Math.min(diff, m - diff);
  }

  for (var i = 0; i < tv_inputs.length; i++) {
    btvinputsel.append($('<option>' + tv_inputs[i] + '</option>'));
  }

  btvinputsel.data('oldv', null);
  btvinputset.click(function() {
    if ($(this).hasClass('active')) {
      return;
    }
    if (btvinputsel.data('oldv') === null) {
      $(this).data('blank', $('<option/>').prependTo(btvinputsel));
      btvinputsel.focus();
    }
    $(this).button('toggle');
  }).click();
  btvinputsel.change(function() {
    // The first selection sets the current value of TV input (don't screw up!)
    if (btvinputset.hasClass('active')) {
      btvinputset.data('blank').remove();
      $(this).data('oldv', $(this).val());
      btvinputset.button('toggle');
    } else {
      var oldv = $(this).data('oldv');
      var newv = $(this).val();

      if (oldv == '') {
        console.log('Please set the current input first.');
        return;
      }

      var oldi = tv_inputs.indexOf(oldv);
      var newi = tv_inputs.indexOf(newv);
      var dist = distMod(oldi, newi, tv_inputs.length);
      var up = false;
      if (((oldi + dist) % tv_inputs.length) != newi) {
        up = true;
      }
      console.log(oldv, oldi, 'to', newv, newi, '=', dist, up ? 'up': 'down');

      play('input');
      for (var i = 0; i < dist; i++) {
        if (up) {
          play('up');
        } else {
          play('down');
        }
      }
      play('enter');
    }
  });

  var alertdiv = $([
    '<div class="alert alert-error fadein" href="#">',
      '<button type="button" class="close" data-dismiss="alert">×</button>',
      'The volume must be in [0, 100]',
    '</div>'].join(''));

  $('#volsetset').click(function() {
    $('#volsetform').submit();
  });
  $('#volsetform').submit(function() {
    var volval = Number($('#volsetinput').val());
    if (0 < volval && volval <= 100) {
      $('#volslide').val(volval);
      $('#volset').click();
      $('#volset_modal').modal('hide');
    } else {
      $('#volset_modal .modal-body').prepend(alertdiv);
    }
    return false;
  });

  $('#volset_modal').on('shown', function() {
    $('#volsetinput').focus();
  });

  $('#volset').click(function() {
    $('#volslide').data('setting', !$('#volslide').data('setting'));
    $(this).button('toggle');
    if ('#volslide'). // TODO
  }).click();
  $('#volslide').change(function() {
    if ($('#volslide').data('setting')) {
      $('#volset_modal').modal('show');
      return false;
    }
  });
  
  function num_button(n) {
    var numbtn = $('<button class="btn">' + n + '</button>');
    var nstr = n + '';
    numbtn.click(function() {play(nstr);});
    return numbtn;
  }

  var m_numbers = $('#m_numbers');
  for (var x = 0; x < 3; x++) {
    var numrow = $('<div></div>');
    for (var y = 0; y < 3; y++) {
      numrow.append(num_button(x * 3 + y + 1));
    }
    m_numbers.append(numrow);
  }
  m_numbers.append(num_button(0));

  var m_record = $('#m_record form');
  m_record.submit(function() {
    var cmd =  $('#m_record input[type=text]').val();
    $.get('/cmd', function(data) {
      if (data.cmds.indexOf(cmd + '.bin') > -1 || cmd.length < 1) {
        console.log('cant record. command ' + cmd + ' exists');
      } else {
        record(cmd);
      }
    }, 'json');
    return false;
  });
});
