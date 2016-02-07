
import java.io.BufferedReader;
import java.io.InputStreamReader;

class EchoMessage {
    public static void main(String[] args) throws Exception{
        System.out.println("READY");
        while(true) {
            BufferedReader buffer=new BufferedReader(new InputStreamReader(System.in));
            String line=buffer.readLine();
            if(line.toLowerCase().equals("exit") || line.toLowerCase().equals("quit")) {
                System.exit(0);
            }
            System.out.println("Echo: " + line);
        }
        
    }
}