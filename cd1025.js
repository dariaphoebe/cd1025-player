function loadAPIClientInterfaces() {
    gapi.client.setApiKey(SETAPIKEY);
}

onClientLoad = function() {
    gapi.client.load('youtube', 'v3', loadAPIClientInterfaces);
}

$(document).ready(function(){
	// Initialize global variables
	var artist = '', song = '';
	var playlist = [];
	var firstPlay = true;
	var player;

	var tag = document.createElement('script');
	tag.src = "https://apis.google.com/js/client.js?onload=onClientLoad";
	var firstScriptTag = document.getElementsByTagName('script')[0];
	firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

	var tag2 = document.createElement('script');
	tag2.src = "https://www.youtube.com/iframe_api";
	tag.parentNode.insertBefore(tag2, tag);

	// Fire the queryCD1025 function every 180 seconds
	var mainInterval = setInterval(function(){
		queryCD1025();
		writePlaylist();
		console.log(playlist);
	},90000);
	
	// Write the playlist array to the DOM
	function writePlaylist(){
		$(".testClass").remove();
		$.each(playlist, function(i, val){
			$("#playlist").append("<tr class='testClass'><td>"+val.artist+"</td><td>"+val.song+"</td><td>"+val.duration+"</td></tr>");
		});
	}
					
	// Use YQL and AJAX to query CD1025.com for the latest played song
    //url: "/~shadow/cd1025/cd1025",
	function queryCD1025(){
		$.ajax({
			type: "GET",
		    url: "http://cd1025.com/a/refresh",
                    success: function(data){
                        $(data.responseText).find(".artist").each(function(i, element){
					if(i === 0){
						// Grab the song data from the AJAX response
						var artistNow = $(this).text().replace("Artist: ","");
						var songNow = $(this).next().text().replace("Song: ","");
						console.log(artistNow + " - " + songNow);
						// Determine if there is a new song
						if(artist != artistNow && song != songNow){
							console.log("New song");
							// Assign the new current song playing
							artist = $(this).text().replace('Artist: ','');
							song = $(this).next().text().replace('Song: ','');	
							// Search YouTube for the song
							queryYoutube(artist, song);
						}
					}
			});
		    }
		});
	}

	// Query YouTube with the latest played song returned by queryCD1025 to get a youtube video ID
	function queryYoutube(artistq, songq){
	    var q = artistq + " " + songq;
	    var requestOptions = {
		part: 'snippet',
		q: q,
		type: 'video',
		maxResults: 1
	    };
	    var request = gapi.client.youtube.search.list(requestOptions);

	    request.execute(findIt);

	    function findIt(response) {
		if (!response.items.length) {
		    console.log('none found');
		}
		else
		    {
			var request = gapi.client.youtube.videos.list ({
				part: 'snippet, contentDetails',
				id: response.result.items[0].id.videoId
			    });

			request.execute(function searchVideos(response2) {
				var x = response2.result.items[0];
				var youTubeID = response.result.items[0].id.videoId;
				var duration = x.contentDetails.duration;
				var length = duration.replace(/[PT]/g, '').replace(/[M]/g, ':').replace(/[S]/g, '');
				// If this is a new session manually load the YouTube player with a song
				if(firstPlay){
				    player.loadVideoById("UVYw6YY_3mI", 0, "large");
				    firstPlay = false;
				}
				// Add the song ID to the playlist array
				console.log(youTubeID);
				playlist.push({"artist":artistq,"song":songq,"duration":length,"id":youTubeID});
			    });
		    }
	    }
	}
	
	// Setup the YouTube player	
	window.onYouTubeIframeAPIReady = function() {
	    console.log('ready');
		player = new YT.Player('player', {
		    playerVars : {
			'playsinline' : 1,
			'showinfo' : 0, 'controls' : 1, 'enablejsapi' : 1, 'modestbranding' : 1, 'color' : 'white', 'iv_load_policy' : 3, 'rel' : 0, 'theme' : 'light'
		    },
			height: '390',
			width: '640',
			events: {
			    'onStateChange': onPlayerStateChange,
			    'onError': onPlayerError
			}
		});
	    queryCD1025();
	}
	
    $("input[name='Next']").click(function() {
	if(!playlist.length){
	    queryCD1025();
	    writePlaylist();
	    console.log(playlist);
	}
	if(!playlist.length){
	    queryCD1025hist();
	} else {
	    player.loadVideoById(playlist[0].id, 0, "large");
	    playlist.shift();
	}
    });

    $("input[name='Reset']").click(function() {
	    player.destroy();
		player = new YT.Player('player', {
		    playerVars : {
			'playsinline' : 1,
			'showinfo' : 0, 'controls' : 1, 'enablejsapi' : 1, 'modestbranding' : 1, 'color' : 'white', 'iv_load_policy' : 3, 'rel' : 0, 'theme' : 'light'
		    },
			height: '390',
			width: '640',
			events: {
			    'onStateChange': onPlayerStateChange,
			    'onError': onPlayerError
			}
		});
			if(!playlist.length){
				player.loadVideoById("UVYw6YY_3mI", 0, "large");
				queryCD1025();
			        writePlaylist();
			        console.log(playlist);
			}
			player.loadVideoById(playlist[0].id, 0, "large");
			playlist.shift();
    });

    var playerReadyInterval;
    var disablePlayerReadyInterval;

            // 4. The API will call this function when the video player is ready.
    function onPlayerReady(event) {
        playerReadyInterval = window.setInterval(function(){
            player.playVideo();
        }, 1000);

        disablePlayerReadyInterval = window.setInterval(function(){
            if (player.getCurrentTime() < 1.0) {
                return;
            }
                    // Video started...
            window.clearInterval(playerReadyInterval);
            window.clearInterval(disablePlayerReadyInterval);
        }, 1000);
    }
	window.onPlayerError = function(event) {
	    if(!playlist.length){
		queryCD1025();
		writePlaylist();
		console.log(playlist);
	    }
	    if(!playlist.length){
		queryCD1025hist();
	    } else {
		player.loadVideoById(playlist[0].id, 0, "large");
		playlist.shift();
	    }
	}

	// Load up the next song in the playlist when the current one is over
	window.onPlayerStateChange = function(event) {
		// Check if the state change is the song ending
		if (event.data == YT.PlayerState.ENDED) {
			// Remove the finished song from the array so the next one can be loaded
			// Check if the playlist is empty
			if(!playlist.length){
				queryCD1025();
			        writePlaylist();
			        console.log(playlist);
			}
			if(!playlist.length){
				queryCD1025hist();
			} else {
			    player.loadVideoById(playlist[0].id, 0, "large");
			    playlist.shift();
			}
		}
	}

	function queryCD1025hist(){
	    var j = Math.floor((Math.random() * 2013)+1)
	    $.ajax({
		type: "GET",
		url: "http://www.dementix.org/~shadow/cd1025/playlist.html",
                success: function(data){
		    var wholelist = $(data).find("#content-main").find('tr').eq(j);
		    // Grab the song data from the AJAX response
		    var artistNow = $(wholelist).children('td').eq(1).text();
		    var songNow = $(wholelist).children('td').eq(2).text();
		    console.log(artistNow + " - " + songNow);
		    queryYoutube(artistNow, songNow);
		}
	    });
	}
});
