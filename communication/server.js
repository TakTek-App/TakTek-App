const io = require("socket.io")(3002, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  }
});

let peers = {}; // Store connected peers

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Register a peer
  socket.on("register", async ({ id, role, firstName, lastName, address, socketId, photo, serviceId, serviceName, companyId, company, rating, reviews, location, services }) => {
    const data = { id, role, firstName, lastName, socketId, photo, location };
    if(role === "user") {
      peers[socket.id] = { ...data, address, serviceId, serviceName};
    }
    else if(role === "technician") {
      peers[socket.id] = { ...data, available: false, companyId, company, rating, reviews, services };
    }
    else if(role === "company") {
      peers[socket.id] = { ...data, socketId }
    }
    console.log(`Registered ${role}:`, socketId);
    console.log("Peers:", peers);

    if (role === "user") {
      io.to(socket.id).emit(
        "peer-list",
        Object.values(peers).filter((peer) => peer.role === "technician")
      );
    }

    if (role === "company" && socketId) {
      const companyTechnicians = Object.values(peers).filter(
        (peer) => peer.role === "technician" && peer.companyId === socketId && peer.available
      );

      io.to(socket.id).emit("peer-list", companyTechnicians);
    }
  });

  // CALLS -----------------------------------------------------------

  // Relay signaling messages
  socket.on("offer", ({ target, offer }) => {
    if (!peers[socket.id]) {
      console.warn(`Offer failed: Peer ${peers[socket.id]} not found.`);
      return;
    }

    if (!peers[socket.id].socketId) {
      console.warn(`Peer ${socket.id} has no socketId property.`);
      return;
    }

    console.log(`Offer received from ${peers[socket.id].socketId} to ${target}`);
    const targetSocket = Object.keys(peers).find((key) => peers[key].socketId === target);
    if (targetSocket) {
      io.to(targetSocket).emit("offer", { offer, sender: peers[socket.id].socketId, senderData: peers[socket.id] });
      console.log("Offer sent to:", target);
    } else {
      console.log(`Target ${target} not found`);
    }
  });

  // Handle call rejection
  socket.on("call-rejected", ({ target }) => {
    if (!peers[socket.id]) {
      console.warn(`Call reject failed: Peer ${peers[socket.id]} not found.`);
      return;
    }

    if (!peers[socket.id].socketId) {
      console.warn(`Peer ${socket.id} has no socketId property.`);
      return;
    }

    const targetSocket = Object.keys(peers).find((key) => peers[key].socketId === target);
    if (targetSocket) {
      io.to(targetSocket).emit("call-rejected", {
        senderData: peers[socket.id],
      });
      console.log(`Call rejected by ${peers[socket.id].socketId} to ${target}`);
    }
  });

  // Relay answer signaling
  socket.on("answer", ({ target, answer }) => {
    if (!peers[socket.id]) {
      console.warn(`Answer failed: Peer ${peers[socket.id]} not found.`);
      return;
    }

    if (!peers[socket.id].socketId) {
      console.warn(`Peer ${socket.id} has no socketId property.`);
      return;
    }

    console.log(`Answer received from ${peers[socket.id].socketId} to ${target}`);
    const targetSocket = Object.keys(peers).find((key) => peers[key].socketId === target);
    if (targetSocket) {
      io.to(targetSocket).emit("answer", {
        answer,
        responderData: peers[socket.id],
      });
      console.log("Answer sent to:", target);
    } else {
      console.log(`Target ${target} not found`);
    }
  });

  // Relay ICE candidates
  socket.on("ice-candidate", ({ target, candidate }) => {
    if (!peers[socket.id]) {
      console.warn(`Ice candidate failed: Peer ${peers[socket.id]} not found.`);
      return;
    }

    if (!peers[socket.id].socketId) {
      console.warn(`Peer ${socket.id} has no socketId property.`);
      return;
    }

    console.log(`ICE candidate received from ${peers[socket.id].socketId} to ${target}`);
    const targetSocket = Object.keys(peers).find((key) => peers[key].socketId === target);
    if (targetSocket) {
      io.to(targetSocket).emit("ice-candidate", { candidate });
      console.log("ICE candidate sent to:", target);
    } else {
      console.log(`Target ${target} not found`);
    }
  });

  // Handle call end
  socket.on("call-ended", ({ target }) => {
    if (!peers[socket.id]) {
      console.warn(`Call end failed: Peer ${peers[socket.id]} not found.`);
      return;
    }

    if (!peers[socket.id].socketId) {
      console.warn(`Peer ${socket.id} has no socketId property.`);
      return;
    }

    // Find the target socket ID using the target socket ID
    const targetSocket = Object.keys(peers).find((key) => peers[key].socketId === target);
  
    if (targetSocket) {
      // Emit the "call-ended" event to the target peer
      io.to(targetSocket).emit("call-ended", {
        senderData: peers[socket.id], // Include full data of the person ending the call
      });
      console.log(`Call ended by ${peers[socket.id].socketId} with ${target}`);
    } else {
      console.log("Target socket not found for call end.");
    }
  });

  socket.on("call-cancelled", ({ target }) => {
    if (!peers[socket.id]) {
      console.warn(`Call cancel failed: Peer ${peers[socket.id]} not found.`);
      return;
    }

    if (!peers[socket.id].socketId) {
      console.warn(`Peer ${socket.id} has no socketId property.`);
      return;
    }

    const targetSocket = Object.keys(peers).find((key) => peers[key].socketId === target);
    if (targetSocket) {
      io.to(targetSocket).emit("call-cancelled", {
        senderData: peers[socket.id], // Include full data of the person canceling the call
      });
      console.log(`Call cancelled by ${peers[socket.id].socketId} with ${target}`);
    } else {
      console.log("Target socket not found for call cancel.");
    }
  });

  // LOCATION ---------------------------------------------------

  socket.on("send-location", (location) => {
    if (peers[socket.id]) {
      console.log(`Received location from ${peers[socket.id].socketId}: ${location}` )
      peers[socket.id].location = location;

      Object.keys(peers).forEach((peerSocketId) => {
        if (peers[peerSocketId].role === "user") {
          io.to(peerSocketId).emit(
            "peer-list",
            Object.values(peers).filter((peer) => peer.role === "technician")
          );
        }
      });
    } else {
      console.log("There was a problem setting the location")
    }
  });

  socket.on("hire", ({ technicianId, clientId }) => {
    const technicianSocket = Object.keys(peers).find(
      (id) => peers[id].socketId === technicianId
    );

    if (technicianSocket) {
      const clientSocket = Object.keys(peers).find(
        (id) => peers[id].socketId === clientId
      );

      const clientData = peers[clientSocket];

      if (clientData) {
        io.to(technicianSocket).emit("hire-request", {
          ...clientData,
        });

        console.log(
          `User ${clientId} wants to hire Technician ${technicianId}`
        );
      } else {
        console.log(`Client ${clientId} location is not available`);
      }
    } else {
      console.log(`Technician ${technicianId} is not available`);
    }
  });

  socket.on("hire-response", ({ response, clientId, technicianId }) => {
    const clientSocket = Object.keys(peers).find(
      (id) => peers[id].socketId === clientId
    );
    const technicianSocket = Object.keys(peers).find(
      (id) => peers[id].socketId === technicianId
    );

    const technicianData = peers[technicianSocket];

    if (!technicianData) {
      console.log(`Technician ${technicianId} data is not available`);
      return;
    }

    if (response === "accept") {
      peers[technicianSocket].available = false;

      io.to(clientSocket).emit("hire-accepted", {
        ...technicianData,
      });

      io.to(technicianSocket).emit(
        "peer-list",
        Object.values(peers).filter((peer) => peer.socketId === clientId)
      );

      const clientLocation = peers[clientSocket]?.location;
      console.log(
        `Technician ${technicianId} accepted the job from ${clientId} at location ${clientLocation.latitude} ${clientLocation.longitude}`
      );
    } else if (response === "reject") {
      io.to(clientSocket).emit("hire-rejected", {
        ...technicianData,
      });

      console.log(
        `Technician ${technicianId} rejected the job from ${clientId}`
      );
    }
  });

  socket.on("toggle-availability", (available) => {
    if (peers[socket.id] && peers[socket.id].role === "technician") {
      peers[socket.id].available = available;

      Object.keys(peers).forEach((peerSocketId) => {
        if (peers[peerSocketId].role === "user") {
          io.to(peerSocketId).emit(
            "peer-list",
            Object.values(peers).filter((peer) => peer.role === "technician")
          );
        }
      });

      Object.keys(peers).forEach((peerSocketId) => {
        if (peers[peerSocketId].role === "company") {
          io.to(peerSocketId).emit(
            "peer-list",
            Object.values(peers).filter((peer) => peer.role === "technician" && peer.companyId === peers[peerSocketId].socketId && peer.available)
          );
        }
      });
    }
  });

  socket.on("cancel-service", ({ clientId, technicianId }) => {
    const clientSocket = Object.keys(peers).find(
      (id) => peers[id].socketId === clientId
    );
    const technicianSocket = Object.keys(peers).find(
      (id) => peers[id].socketId === technicianId
    );

    if (peers[technicianSocket]) {
      peers[technicianSocket].available = true;
    }

    io.to(clientSocket).emit("service-cancelled");
    io.to(technicianSocket).emit("service-cancelled");

    console.log(
      `Job between client ${clientId} and technician ${technicianId} was cancelled.`
    );
  });

  socket.on("end-service", ({ clientId, technicianId }) => {
    const clientSocket = Object.keys(peers).find(
      (id) => peers[id].socketId === clientId
    );
    const technicianSocket = Object.keys(peers).find(
      (id) => peers[id].socketId === technicianId
    );

    if (peers[technicianSocket]) {
      peers[technicianSocket].available = true;
    }

    io.to(clientSocket).emit("service-ended", {
      message: "The job has been completed!",
    });
    io.to(technicianSocket).emit("service-ended", {
      message: "Job completed!",
    });

    console.log(
      `Job between client ${clientId} and technician ${technicianId} is complete.`
    );
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    const peer = peers[socket.id];
    if (peer) {
      if (peer.role === "technician") {
        peer.available = false;
      }
    }
    delete peers[socket.id];
    Object.keys(peers).forEach((peerSocketId) => {
      if (peers[peerSocketId].role === "user") {
        io.to(peerSocketId).emit(
          "peer-list",
          Object.values(peers).filter((peer) => peer.role === "technician")
        );
      }
    });
  });
});