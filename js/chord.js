function getC(noteArray) {
    console.log(noteArray.toString())
    switch (noteArray.toString()) {
        case ['c', 'e', 'g'].toString():
            return 'C'
        case ['c', 'f', 'g'].toString():
            return 'Csus4'
        default:
            return 'N/A'
    }
}