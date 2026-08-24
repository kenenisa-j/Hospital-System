const { Server } = require("socket.io");

function initQueueSocketServer(server) {
    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:3000",
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        console.log(`[Socket] Client connected: ${socket.id}`);

        // Join specific Clinical Room (e.g., "General OPD" or "Doctor_123")
        socket.on("join_queue_room", ({ department, doctorId }) => {
            if (department) socket.join(`dept_${department}`);
            if (doctorId) socket.join(`doc_${doctorId}`);
            console.log(`[Socket] ${socket.id} joined rooms: dept_${department}, doc_${doctorId}`);
        });

        socket.on("disconnect", () => {
            console.log(`[Socket] Client disconnected: ${socket.id}`);
        });
    });

    return io;
}

// Controller logic triggered when Cashier clears payment
async function handlePaymentClearance(io, visitData) {
    const clearedQueueItem = {
        id: visitData.id,
        ticketNumber: visitData.ticketNumber,
        patientName: visitData.patient.fullName,
        patientMrn: visitData.patient.mrn,
        department: visitData.department,
        doctorId: visitData.assignedDoctorId,
        status: "WAITING", // Status flips from PENDING_PAYMENT -> WAITING upon payment
        arrivalTime: new Date().toISOString(),
        triagePriority: visitData.triagePriority,
    };

    // Broadcast event to target department and specific assigned doctor
    io.to(`dept_${visitData.department}`).emit("patient_cleared_payment", clearedQueueItem);
    if (visitData.assignedDoctorId) {
        io.to(`doc_${visitData.assignedDoctorId}`).emit("patient_cleared_payment", clearedQueueItem);
    }
}

module.exports = { initQueueSocketServer, handlePaymentClearance };