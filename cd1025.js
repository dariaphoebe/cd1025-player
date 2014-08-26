$(document).ready(function(){
	// Initialize global variables
	var artist = '', song = '';
	var playlist = [];
	var firstPlay = true;
	var player;

	// Fire the queryCD1025 function every 5 seconds
	var mainInterval = setInterval(function(){
		queryCD1025();
		writePlaylist();
	},5000);
	
	// Write the playlist array to the DOM
	function writePlaylist(){
		$(".testClass").remove();
		$.each(playlist, function(i, val){
			$("#playlist").append("<tr class='testClass'><td>"+val.artist+"</td><td>"+val.song+"</td><td>"+val.duration+"</td></tr>");
		});
	}
					
	// Use YQL and AJAX to query CD1025.com for the latest played song
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
						// Determine if there is a new song
						if(artist != artistNow && song != songNow){
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
	
	function queryX1067(){
		$.ajax({
			type: "GET",
			url: "http://www.x1067.com/services/now_playing.html?streamId=3632&limit=3",
			success: function(data){
				var obj = $(data.responseText).text();
				obj = jQuery.parseJSON(obj);
				for(var i = 0; i < 3; i++){
					queryYoutube(obj.tracks[i].track.artistName, obj.tracks[i].track.trackTitle);
				}
			}
		});		
	}
			
	// Query YouTube with the latest played song returned by queryCD1025 to get a youtube video ID
	function queryYoutube(artistq, songq){
		qURL = "https://gdata.youtube.com/feeds/api/videos?q="+artistq+" "+songq+"&v=2&alt=jsonc";
		$.ajax({
			type: "GET",
			url: qURL,
			dataType: "json",
			success: function(data){
				// Parse out the ID and duration from the json response
				var youTubeID = data.data.items[0].id;
				var duration = data.data.items[0].duration;
				// If this is a new session manually load the YouTube player with a song
				if(firstPlay){
					player.loadVideoById("UVYw6YY_3mI", 0, "large");
					firstPlay = false;
				}
				// Format duration from seconds to mm:ss format
				var minutes = Math.floor(duration / 60);
				var seconds = duration - minutes * 60;
				if(seconds < 10)
					seconds = "0"+seconds;
				duration = minutes + ":" + seconds;
				// Add the song ID to the playlist array
				console.log(youTubeID);
				playlist.push({"artist":artistq,"song":songq,"duration":duration,"id":youTubeID});
			}
		});
	}						
	
	// Setup the YouTube player	
	window.onYouTubeIframeAPIReady = function() {
		player = new YT.Player('player', {
			height: '390',
			width: '640',
			playerVars: {
			    'playsinline' : 1,
			    'enablejsapi' : 1,
			    'controls' : 1
			},
			events: {
			    'onError': onPlayerError,
			    'onStateChange': onPlayerStateChange
			}
		});
	}
	
	window.onPlayerError = function(event) {
                       if(!playlist.length){
                               player.loadVideoById("UVYw6YY_3mI", 0, "large");
                               queryCD1025();
                               writePlaylist();
                               console.log(playlist);
                       }
                       player.loadVideoById(playlist[0].id, 0, "large");
                       playlist.shift();
       }

	// Load up the next song in the playlist when the current one is over
	window.onPlayerStateChange = function(event) {
		// Check if the state change is the song ending
		if (event.data == YT.PlayerState.ENDED) {
			// Remove the finished song from the array so the next one can be loaded
			// Check if the playlist is empty
			if(!playlist.length){
				player.loadVideoById("UVYw6YY_3mI", 0, "large");
				queryX1067();
			}
			player.loadVideoById(playlist[0].id, 0, "large");
			playlist.shift();
		}
	}
});
